import React, { useState } from 'react';
import { useImportWizard } from '../../hooks/useAdmin';

export const ImportWizardPage: React.FC = () => {
  const {
    step,
    setStep,
    fileName,
    parsedHeaders,
    rawRows,
    mappings,
    validationErrors,
    importSummary,
    isProcessing,
    handleFileUpload,
    loadSampleData,
    triggerColumnDetection,
    updateMapping,
    triggerValidation,
    executeFinalImport,
    resetWizard,
  } = useImportWizard();

  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const fieldOptions = [
    { value: 'unmapped', label: '-- Ignore Column --' },
    { value: 'sn', label: 'S/N (Serial Number)' },
    { value: 'date', label: 'Date' },
    { value: 'noOfDays', label: 'No. of Days' },
    { value: 'timeDuration', label: 'Time Duration' },
    { value: 'clientName', label: 'Client Name' },
    { value: 'facility', label: 'Facility' },
    { value: 'amount', label: 'Amount' },
    { value: 'modeOfPayment', label: 'Mode of Payment' },
    { value: 'daysUsed', label: 'Days Used' },
    { value: 'daysLeft', label: 'Days Left' },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 border border-gray-200/80 rounded-2xl shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-gray-900 font-heading flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <i className="fa-solid fa-file-csv text-sm"></i>
            </span>
            Excel & CSV Import Wizard
          </h1>
          <p className="text-xs text-gray-500 font-sans mt-1">
            Seamlessly import legacy spreadsheets, monthly Facility Records, and booking logs directly into the ERP database
          </p>
        </div>

        {step > 1 && (
          <button
            onClick={resetWizard}
            className="px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <i className="fa-solid fa-rotate-left text-xs"></i>
            Reset Wizard
          </button>
        )}
      </div>

      {/* Wizard Progress Bar Stepper */}
      <div className="bg-white p-4 sm:p-5 border border-gray-200/80 rounded-2xl shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          {[
            { num: 1, label: 'Upload' },
            { num: 2, label: 'Preview' },
            { num: 3, label: 'Detection' },
            { num: 4, label: 'Mapping' },
            { num: 5, label: 'Validation' },
            { num: 6, label: 'Summary' },
          ].map((s) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div
                key={s.num}
                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                    : isCompleted
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-700 font-medium'
                    : 'bg-gray-50 border-gray-200/70 text-gray-400 font-normal'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? <i className="fa-solid fa-check text-[10px]"></i> : s.num}
                </div>
                <span className="text-xs font-sans truncate">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: UPLOAD */}
      {step === 1 && (
        <div className="bg-white border border-gray-200/80 rounded-2xl p-8 sm:p-12 shadow-2xs text-center space-y-6">
          <div className="max-w-xl mx-auto space-y-2">
            <h2 className="text-lg font-bold text-gray-900 font-heading">Step 1: Upload Spreadsheet File</h2>
            <p className="text-xs text-gray-500 font-sans">
              Upload your monthly Facility Record spreadsheet (.xlsx, .xls, .csv). The ERP will auto-detect columns without requiring manual spreadsheet restructuring.
            </p>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`max-w-xl mx-auto border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center cursor-pointer ${
              dragActive
                ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
                : 'border-gray-300 hover:border-blue-400 bg-gray-50/50 hover:bg-blue-50/20'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-3">
              <i className="fa-solid fa-cloud-arrow-up text-2xl"></i>
            </div>
            <p className="text-sm font-semibold text-gray-800">
              Drag & Drop your Excel or CSV spreadsheet here
            </p>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              Supports .xlsx, .xls, and .csv files (up to 50MB)
            </p>
            <label className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2">
              <i className="fa-solid fa-folder-open text-xs"></i>
              Browse Spreadsheet File
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          <div className="pt-4 border-t border-gray-100 max-w-xl mx-auto flex items-center justify-between text-xs text-gray-500">
            <span>Want to test immediately?</span>
            <button
              onClick={loadSampleData}
              className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer underline flex items-center gap-1"
            >
              <i className="fa-solid fa-table"></i>
              Load Sample Monthly Facility Master Sheet
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW SPREADSHEET */}
      {step === 2 && (
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 font-heading flex items-center gap-2">
                <span>Step 2: Preview Loaded Spreadsheet</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-normal bg-blue-50 text-blue-700 border border-blue-200">
                  {fileName}
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-1 font-sans">
                Inspected {parsedHeaders.length} columns and {rawRows.length} rows of historical data
              </p>
            </div>
            <button
              onClick={triggerColumnDetection}
              disabled={isProcessing}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                  Analyzing Columns...
                </>
              ) : (
                <>
                  Next: Automatic Column Detection
                  <i className="fa-solid fa-arrow-right text-xs"></i>
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
                <tr>
                  <th className="px-3 py-2.5 border-r border-gray-200 text-center w-12 bg-gray-100 text-gray-400">#</th>
                  {parsedHeaders.map((h, i) => (
                    <th key={i} className="px-4 py-2.5 whitespace-nowrap border-r border-gray-200">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {rawRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/60 font-mono">
                    <td className="px-3 py-2 border-r border-gray-100 text-center text-gray-400 font-sans text-[11px] bg-gray-50/50">
                      {idx + 1}
                    </td>
                    {parsedHeaders.map((h, colIdx) => (
                      <td key={colIdx} className="px-4 py-2 border-r border-gray-100 whitespace-nowrap text-xs">
                        {String(row[h] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STEP 3 & 4: AUTOMATIC COLUMN DETECTION & AI ASSISTED MAPPING */}
      {(step === 3 || step === 4) && (
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 font-heading flex items-center gap-2">
                <span>Step 4: AI Assisted Column Mapping</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-normal bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Auto-Detected ({mappings.filter((m) => m.detectedField !== 'unmapped').length}/{parsedHeaders.length} Matched)
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-1 font-sans">
                Review and verify automatically mapped Excel headers to ERP database target fields.
              </p>
            </div>
            <button
              onClick={triggerValidation}
              disabled={isProcessing}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                  Validating Data...
                </>
              ) : (
                <>
                  Proceed to Step 5: Validation
                  <i className="fa-solid fa-arrow-right text-xs"></i>
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-medium">
                <tr>
                  <th className="px-4 py-3">Excel Column Header</th>
                  <th className="px-4 py-3">Sample File Values</th>
                  <th className="px-4 py-3">Auto-Detected Target Field</th>
                  <th className="px-4 py-3 text-center">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mappings.map((m) => (
                  <tr key={m.excelColumn} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-semibold text-gray-900 font-heading">
                      <div className="flex items-center gap-2">
                        <i className="fa-solid fa-table-columns text-gray-400"></i>
                        {m.excelColumn}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-[11px]">
                      {m.sampleValues.slice(0, 2).join(', ')}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={m.detectedField}
                        onChange={(e) => updateMapping(m.excelColumn, e.target.value)}
                        className={`w-full px-3 py-1.5 border rounded-lg text-xs font-medium focus:outline-none transition-all cursor-pointer ${
                          m.detectedField !== 'unmapped'
                            ? 'bg-blue-50/50 border-blue-200 text-blue-900 font-semibold'
                            : 'bg-gray-50 border-gray-200 text-gray-500'
                        }`}
                      >
                        {fieldOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.confidence >= 90
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : m.confidence > 0
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}
                      >
                        {m.confidence}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STEP 5: VALIDATION */}
      {step === 5 && (
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 font-heading flex items-center gap-2">
                <span>Step 5: Data Integrity Validation</span>
                {validationErrors.length === 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-normal bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <i className="fa-solid fa-circle-check mr-1"></i>
                    All Records Valid
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-normal bg-amber-50 text-amber-700 border border-amber-200">
                    {validationErrors.length} Warnings/Notices
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500 mt-1 font-sans">
                Review data verification warnings before committing to the ERP database.
              </p>
            </div>

            <button
              onClick={executeFinalImport}
              disabled={isProcessing}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                  Processing Database Import...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-database text-xs"></i>
                  Execute Final Database Import
                </>
              )}
            </button>
          </div>

          {validationErrors.length === 0 ? (
            <div className="p-8 text-center bg-emerald-50/50 border border-emerald-200 rounded-xl text-emerald-800 space-y-2">
              <i className="fa-solid fa-circle-check text-3xl text-emerald-600 block"></i>
              <h3 className="text-sm font-bold font-heading">Validation Passed Successfully!</h3>
              <p className="text-xs text-emerald-700 max-w-md mx-auto">
                No critical errors or missing fields were detected in this batch. All records are ready for seamless database insertion.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-medium">
                  <tr>
                    <th className="px-4 py-3 text-center">Row</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Field</th>
                    <th className="px-4 py-3">Validation Warning / Notice</th>
                    <th className="px-4 py-3">Raw Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {validationErrors.map((err, i) => (
                    <tr key={i} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 text-center font-mono font-bold text-gray-700">
                        Row #{err.row}
                      </td>
                      <td className="px-4 py-3">
                        {err.severity === 'error' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                            Error
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <i className="fa-solid fa-circle-exclamation"></i>
                            Warning
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{err.field}</td>
                      <td className="px-4 py-3 text-gray-700">{err.issue}</td>
                      <td className="px-4 py-3 font-mono text-gray-500 text-[11px]">
                        {err.value !== null ? String(err.value) : '<empty>'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STEP 6: IMPORT SUMMARY */}
      {step === 6 && importSummary && (
        <div className="bg-white border border-gray-200/80 rounded-2xl p-8 shadow-2xs space-y-8 animate-fadeIn">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-2 text-2xl shadow-xs">
              <i className="fa-solid fa-[#000] fa-check"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900 font-heading">
              Import Completed Successfully!
            </h2>
            <p className="text-xs text-gray-500 max-w-lg mx-auto font-sans">
              Spreadsheet data has been successfully imported into the ERP database. Historical records have automatically populated CRM, Bookings, Facility Records, and Financial Dashboards.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 text-center">
              <p className="text-xs font-medium text-gray-500">Processed Rows</p>
              <p className="text-2xl font-bold text-gray-900 font-heading mt-1">{importSummary.totalRows}</p>
            </div>
            <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200 text-center">
              <p className="text-xs font-medium text-emerald-700">Bookings Created</p>
              <p className="text-2xl font-bold text-emerald-700 font-heading mt-1">{importSummary.importedBookings}</p>
            </div>
            <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-200 text-center">
              <p className="text-xs font-medium text-blue-700">CRM Clients Populated</p>
              <p className="text-2xl font-bold text-blue-700 font-heading mt-1">{importSummary.createdClients}</p>
            </div>
            <div className="bg-purple-50/60 p-5 rounded-2xl border border-purple-200 text-center">
              <p className="text-xs font-medium text-purple-700">Revenue Integrated</p>
              <p className="text-2xl font-bold text-purple-700 font-heading mt-1">
                ${importSummary.revenueAdded.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-center gap-4">
            <button
              onClick={resetWizard}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
            >
              <i className="fa-solid fa-file-import text-xs"></i>
              Import Another Spreadsheet
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
