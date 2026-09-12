import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import config from '../config/config';
import { executeQuery } from '../database/db';

const router = Router();

async function ensureAiTableExists() {
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS \`ai_messages\` (
        \`id\` VARCHAR(100) NOT NULL,
        \`conversation_id\` VARCHAR(100) NOT NULL DEFAULT 'default',
        \`sender\` ENUM('user', 'assistant') NOT NULL,
        \`text\` TEXT NOT NULL,
        \`timestamp\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_ai_messages_conv\` (\`conversation_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } catch (err) {
    console.error('Error creating ai_messages table:', err);
  }
}

// Call on module load
ensureAiTableExists().catch(console.error);

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
  const model = process.env.GEMINI_MODEL || config.geminiModel || 'gemini-2.5-flash-lite';
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
      `INSERT INTO ai_messages (id, conversation_id, sender, text, timestamp) VALUES (?, 'default', 'user', ?, NOW())`,
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
      `INSERT INTO ai_messages (id, conversation_id, sender, text, timestamp) VALUES (?, 'default', 'assistant', ?, NOW())`,
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

export default router;
