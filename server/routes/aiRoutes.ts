import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import config from '../config/config';
import { executeQuery } from '../database/db';

import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();
// The assistant reads business-wide figures, so it requires a signed-in user with dashboard access.
router.use(authenticate, requirePermission('dashboard'));

async function ensureAiTableExists() {
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS \`ai_messages\` (
        \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
        \`conversation_id\` VARCHAR(100) NOT NULL DEFAULT 'default',
        \`sender\` VARCHAR(50) NOT NULL,
        \`text\` TEXT NOT NULL,
        \`timestamp\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err: any) {
    // Schema is handled either here or in db.ensureDatabaseSchema / memoryDb
  }
}

// Call on module load
ensureAiTableExists().catch(() => {});

const getGeminiClient = () => {
  const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) return null;
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const getSelectedModel = (): string => {
  const model = process.env.GEMINI_MODEL || config.geminiModel || 'gemini-3.8-flash';
  return model.trim();
};

async function buildDynamicSystemInstruction(): Promise<string> {
  let director = 'Executive Management';
  let businessName = 'Nexus ERP Enterprise';
  let totalRev = 0;
  let totalBookings = 0;
  let totalExp = 0;
  let totalClients = 0;
  let totalFacilities = 0;
  let totalBranches = 0;

  try {
    const settings = await executeQuery<any>(`SELECT business_name, director_name FROM business_settings LIMIT 1`);
    if (settings.length > 0) {
      if (settings[0].director_name) director = settings[0].director_name;
      if (settings[0].business_name) businessName = settings[0].business_name;
    }

    const bRes = await executeQuery<any>(`SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as totalRev FROM bookings`);
    if (bRes.length > 0) {
      totalBookings = Number(bRes[0].cnt) || 0;
      totalRev = Number(bRes[0].totalRev) || 0;
    }

    const eRes = await executeQuery<any>(`SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as totalExp FROM expenses`);
    if (eRes.length > 0) {
      totalExp = Number(eRes[0].totalExp) || 0;
    }

    const cRes = await executeQuery<any>(`SELECT COUNT(*) as cnt FROM clients`);
    if (cRes.length > 0) {
      totalClients = Number(cRes[0].cnt) || 0;
    }

    const fRes = await executeQuery<any>(`SELECT COUNT(*) as cnt FROM facilities`);
    if (fRes.length > 0) {
      totalFacilities = Number(fRes[0].cnt) || 0;
    }

    const brRes = await executeQuery<any>(`SELECT COUNT(*) as cnt FROM branches`);
    if (brRes.length > 0) {
      totalBranches = Number(brRes[0].cnt) || 0;
    }
  } catch (err) {
    console.error('Error fetching live metrics for AI context:', err);
  }

  const netProfit = totalRev - totalExp;

  return `You are Tosin ("Ask Tosin"), the intelligent executive AI Assistant for ${businessName}. Director of the company is ${director}. You analyze operational revenue, facility occupancy, expenses, customer order metrics, and business forecasting across all enterprise branches.

DATABASE STATUS:
- Registered Branches: ${totalBranches}
- Registered Facilities: ${totalFacilities}
- Total Customers: ${totalClients}
- Total Bookings Recorded: ${totalBookings}
- Total Gross Revenue: ₦${totalRev.toLocaleString()}
- Total Operating Expenses: ₦${totalExp.toLocaleString()}
- Net Profit: ₦${netProfit.toLocaleString()}

IMPORTANT: Rely strictly on real database data. If there are 0 bookings, 0 expenses, or 0 customers in the database, clearly inform the user that no records have been added to the system yet. Never invent or hallucinate fake transactions, customers, or numbers. Respond concisely, warmly, and professionally using clear formatting.`;
}

// GET chat history from MySQL
router.get('/history', async (req: Request, res: Response) => {
  try {
    await ensureAiTableExists();
    const rows = await executeQuery<any>(
      `SELECT id, sender, text, DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:%s') as timestamp FROM ai_messages WHERE conversation_id = 'default' ORDER BY timestamp ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err: any) {
    console.error('Error fetching AI history:', err);
    res.status(500).json({ success: false, message: err.message, data: [] });
  }
});

// DELETE chat history in MySQL
router.delete('/history', async (req: Request, res: Response) => {
  try {
    await ensureAiTableExists();
    await executeQuery(`DELETE FROM ai_messages WHERE conversation_id = 'default'`);
    res.json({ success: true, message: 'Chat history cleared' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Helper function to handle and categorize Gemini API errors gracefully
function handleGeminiError(error: any, modelName: string): { replyText: string; errorType: string; statusCode: number } {
  const errStr = String(error?.message || error || '').toLowerCase();
  const errCode = error?.status || error?.code || 500;

  console.error(`❌ [Gemini Error] Model: ${modelName} | Error:`, error);

  if (errStr.includes('not_found') || errStr.includes('404') || errStr.includes('no longer available') || errStr.includes('not found')) {
    return {
      replyText: `[Gemini Model Error] The model "${modelName}" is not available or outdated. Please update GEMINI_MODEL in your .env file to a valid supported model like "gemini-2.5-flash-lite".`,
      errorType: 'INVALID_MODEL',
      statusCode: 404,
    };
  }

  if (errStr.includes('api_key') || errStr.includes('api key') || errStr.includes('unauthorized') || errStr.includes('invalid_argument') || errStr.includes('401') || errStr.includes('403')) {
    return {
      replyText: `[Gemini Authentication Error] Invalid or unauthorized API key provided. Please verify GEMINI_API_KEY in your .env file.`,
      errorType: 'INVALID_API_KEY',
      statusCode: 401,
    };
  }

  if (errStr.includes('429') || errStr.includes('resource_exhausted') || errStr.includes('quota') || errStr.includes('rate limit')) {
    return {
      replyText: `[Gemini Rate Limit] The API quota or rate limit was exceeded for model "${modelName}". Please wait a moment and try again.`,
      errorType: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    };
  }

  if (errStr.includes('timeout') || errStr.includes('etimedout') || errStr.includes('econnreset') || errStr.includes('fetch failed')) {
    return {
      replyText: `[Gemini Network Error] Connection timed out while communicating with Google Gemini AI. Please check your network connection and retry.`,
      errorType: 'NETWORK_TIMEOUT',
      statusCode: 504,
    };
  }

  return {
    replyText: `[Gemini API Error] Unable to generate response with model "${modelName}": ${error.message || 'Unknown error'}`,
    errorType: 'API_ERROR',
    statusCode: 500,
  };
}

router.post('/chat', async (req: Request, res: Response) => {
  try {
    await ensureAiTableExists();
    const { prompt, history } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ success: false, error: 'Prompt is required' });
      return;
    }

    // Save user message to MySQL
    const userMsgId = `MSG-USR-${Date.now()}`;
    await executeQuery(
      `INSERT INTO ai_messages (id, conversation_id, sender, text, timestamp) VALUES (?, 'default', 'user', ?, CURRENT_TIMESTAMP)`,
      [userMsgId, prompt]
    );

    const ai = getGeminiClient();
    const selectedModel = getSelectedModel();
    let replyText = '';
    let hasError = false;
    let errorCategory = '';

    if (!ai) {
      replyText = `Gemini API Key is not configured on the server. Please configure GEMINI_API_KEY in server environment settings to enable live AI responses.`;
    } else {
      try {
        const dynamicInstruction = await buildDynamicSystemInstruction();

        // Format conversation history for Gemini API
        const contents: any[] = [];

        if (Array.isArray(history)) {
          history.forEach((msg: { sender: string; text: string }) => {
            if (msg.sender === 'user') {
              contents.push({ role: 'user', parts: [{ text: msg.text }] });
            } else if (msg.sender === 'assistant') {
              contents.push({ role: 'model', parts: [{ text: msg.text }] });
            }
          });
        }

        contents.push({ role: 'user', parts: [{ text: prompt }] });

        console.log(`🤖 Processing Gemini Chat request using model: "${selectedModel}"`);

        const response = await ai.models.generateContent({
          model: selectedModel,
          contents,
          config: {
            systemInstruction: dynamicInstruction,
            temperature: 0.7,
          },
        });

        replyText = response.text || 'I analyzed the enterprise records, but received no text response.';
      } catch (geminiErr: any) {
        hasError = true;
        const errResult = handleGeminiError(geminiErr, selectedModel);
        replyText = errResult.replyText;
        errorCategory = errResult.errorType;
      }
    }

    // Save assistant message to MySQL (even if error response, so history is preserved)
    const assistantMsgId = `MSG-AST-${Date.now()}`;
    await executeQuery(
      `INSERT INTO ai_messages (id, conversation_id, sender, text, timestamp) VALUES (?, 'default', 'assistant', ?, CURRENT_TIMESTAMP)`,
      [assistantMsgId, replyText]
    );

    res.json({
      success: !hasError,
      text: replyText,
      id: assistantMsgId,
      userMsgId,
      modelUsed: selectedModel,
      ...(hasError ? { error: errorCategory } : {}),
    });
  } catch (error: any) {
    console.error('Fatal server error in /api/ai/chat:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || 'Internal server error processing AI chat request',
    });
  }
});

// POST AI-assisted Narrative for Executive PDF Reports (Section I)
router.post('/report-narrative', async (req: Request, res: Response) => {
  try {
    const { periodLabel = 'Current Period', branchName = 'All Branches', analytics } = req.body;

    if (!analytics) {
      res.status(400).json({ success: false, error: 'Analytics data is required for narrative analysis' });
      return;
    }

    const totalRev = Number(analytics.totalRevenue || 0);
    const totalExp = Number(analytics.totalExpenses || 0);
    const netProfit = Number(analytics.netProfit || 0);
    const netMargin = Number(analytics.netProfitMargin || 0);
    const totalBookings = Number(analytics.totalBookings || 0);
    const uniqueClients = Number(analytics.uniqueClients || 0);
    const occupancy = Number(analytics.occupancyRate || 0);

    const topFac = analytics.facilityRevenueBreakdown?.[0];
    const topCat = analytics.expenseCategoryBreakdown?.[0];

    // High-quality deterministic fallback narrative
    const deterministicNarrative = [
      `Executive Summary: During the ${periodLabel} period across ${branchName}, the enterprise recorded total revenue of ₦${totalRev.toLocaleString()} against operating expenses of ₦${totalExp.toLocaleString()}, yielding a net operating profit of ₦${netProfit.toLocaleString()} with a profit margin of ${netMargin.toFixed(1)}%. Operational volume comprised ${totalBookings} qualifying bookings across ${uniqueClients} unique client accounts.`,
      `Facility Space Utilization: The top revenue contributor was ${topFac ? `${topFac.facility} (₦${Number(topFac.revenue).toLocaleString()} or ${topFac.percentage}%)` : 'registered enterprise facilities'}. Overall facility utilization averaged ${occupancy.toFixed(1)}%, reflecting healthy space turnover.`,
      `Operating Cost Analysis: Operating expenditures were led by ${topCat ? `${topCat.category} (₦${Number(topCat.amount).toLocaleString()} or ${topCat.percentage}%)` : 'standard operational overhead'}. Cost structures remained aligned with current booking volume and facility maintenance needs.`,
      `Strategic Audit Takeaways: Maintain yield management across peak booking intervals to protect net operating margins. Monitor recurring facility expenditures to optimize operating leverage as client transaction volume scales.`,
    ].join('\n\n');

    const ai = getGeminiClient();
    const selectedModel = getSelectedModel();

    if (!ai) {
      res.json({
        success: true,
        isAiGenerated: false,
        narrative: deterministicNarrative,
        message: 'Deterministic analysis generated (Gemini API key not configured)',
      });
      return;
    }

    try {
      const prompt = `You are a Senior Financial & Operational Auditor analyzing official ERP metrics for an enterprise workspace company.
Analyze the following authoritative aggregated data for the reporting period:

REPORT CONTEXT:
- Period: ${periodLabel}
- Scope: ${branchName}
- Gross Revenue: ₦${totalRev.toLocaleString()}
- Operating Expenses: ₦${totalExp.toLocaleString()}
- Net Profit: ₦${netProfit.toLocaleString()}
- Profit Margin: ${netMargin.toFixed(1)}%
- Total Bookings: ${totalBookings}
- Unique Clients: ${uniqueClients}
- Occupancy Utilization: ${occupancy.toFixed(1)}%
- Top Facilities by Revenue: ${
        analytics.facilityRevenueBreakdown
          ? analytics.facilityRevenueBreakdown
              .slice(0, 3)
              .map((f: any) => `${f.facility} (₦${Number(f.revenue).toLocaleString()}, ${f.percentage}%)`)
              .join(', ')
          : 'None'
      }
- Top Operating Expense Categories: ${
        analytics.expenseCategoryBreakdown
          ? analytics.expenseCategoryBreakdown
              .slice(0, 3)
              .map((c: any) => `${c.category} (₦${Number(c.amount).toLocaleString()}, ${c.percentage}%)`)
              .join(', ')
          : 'None'
      }

TASK:
Provide an executive-grade financial narrative explaining trends, unusual movements, and key findings.
Format your response into 4 distinct concise paragraphs:
1. Executive Summary: 2-3 sentences summarizing the overall financial health, net profit, and profit margin.
2. Space & Revenue Performance: Analysis of facility performance, revenue concentration, and capacity utilization.
3. Cost Efficiency & Expense Drivers: Observations on primary cost drivers and expense-to-revenue ratio.
4. Strategic Management Takeaways: 2-3 actionable observations for executive leadership.

NON-NEGOTIABLE AUDIT RULES:
- Strictly adhere to the numbers provided above. Never invent or hallucinate different revenue, expenses, profit, or dates.
- Do NOT output markdown headings like # or ##; use clean labeled paragraph intros like "Executive Summary:", "Space & Revenue Performance:", etc.
- Keep the tone formal, audit-grade, concise, and professional.`;

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.2, // Low temperature for factual audit consistency
        },
      });

      const aiText = response.text?.trim();

      if (aiText && aiText.length > 50) {
        res.json({
          success: true,
          isAiGenerated: true,
          narrative: aiText,
          modelUsed: selectedModel,
        });
        return;
      }
    } catch (geminiErr: any) {
      console.warn('⚠️ [AI Report Narrative Error] Falling back to deterministic narrative:', geminiErr.message);
    }

    res.json({
      success: true,
      isAiGenerated: false,
      narrative: deterministicNarrative,
      message: 'Deterministic analysis generated (AI service offline or error occurred)',
    });
  } catch (err: any) {
    console.error('Fatal error generating report narrative:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
