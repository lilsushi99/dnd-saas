import React, { useState } from 'react';

export const CommunicationsPage: React.FC = () => {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNotification = (channelName: string) => {
    setToastMessage(`${channelName} Gateway integration coming soon.`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const modules = [
    {
      id: 'whatsapp',
      title: 'WhatsApp Broadcast',
      icon: 'fa-brands fa-whatsapp',
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      description: 'Bulk customer messaging directly to verified WhatsApp phone numbers for real-time announcements, branch notifications, and booking updates.',
      features: [
        'Target by branch location or VIP status',
        'Personalized template tags ({customer_name}, {facility})',
        'Delivery & read status webhooks',
        'Opt-out / compliance tracking',
      ],
      tag: 'Bulk Messaging',
      apiGateway: 'WhatsApp Business Cloud API',
    },
    {
      id: 'email',
      title: 'Email Campaigns',
      icon: 'fa-solid fa-envelope-open-text',
      iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
      description: 'Mass HTML email campaign engine with responsive template builder, automated welcome sequences, and delivery analytics.',
      features: [
        'Drag & drop HTML template editor',
        'Automated onboarding & welcome flows',
        'Real-time open and click-through metrics',
        'Custom domain SMTP relay setup',
      ],
      tag: 'Mass Emailing',
      apiGateway: 'Transactional SMTP / SendGrid API',
    },
    {
      id: 'reminders',
      title: 'Automated Reminders',
      icon: 'fa-solid fa-bell',
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      description: 'Instant automated check-in and reservation schedule notifications sent prior to scheduled facility times.',
      features: [
        '24h & 1h pre-arrival automated alerts',
        'Facility access directions & pass codes',
        'One-click schedule modification links',
        'Automated calendar (.ics) attachments',
      ],
      tag: 'Check-in Alerts',
      apiGateway: 'Scheduled Background Worker Engine',
    },
    {
      id: 'expiry',
      title: 'Subscription Expiry Notifications',
      icon: 'fa-solid fa-clock-rotate-left',
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
      description: 'Smart automated sequence notifying customers when their subscription has 5, 3, or 1 days remaining to prevent lapse.',
      features: [
        'Automatic trigger at 5-day expiration threshold',
        'Automated renewal payment links',
        'Discount incentive coupon codes',
        'Auto-dunning retry notifications',
      ],
      tag: 'Auto Renewal',
      apiGateway: 'Notification Template Engine',
    },
    {
      id: 'promo',
      title: 'Promotional Campaigns',
      icon: 'fa-solid fa-bullhorn',
      iconBg: 'bg-purple-50 text-purple-600 border-purple-200',
      description: 'Seasonal marketing broadcasts, branch grand openings, flash discount announcements, and loyalty reward perks.',
      features: [
        'Segmented customer directory targeting',
        'Tracked promotional discount codes',
        'A/B message testing engine',
        'Campaign ROI conversion tracking',
      ],
      tag: 'Marketing Suite',
      apiGateway: 'Multi-channel Broadcast Gateway',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-top-2 duration-200 border border-gray-700">
          <i className="fa-solid fa-circle-info text-blue-400"></i>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
              <i className="fa-solid fa-clock text-[9px] mr-1"></i>
              Coming Soon
            </span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-gray-900 tracking-tight mt-2">
            Customer Communications Centre
          </h1>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Centralized hub for multi-channel customer engagement, automated SMS/Email reminders, subscription expiry alerts, and promotional broadcasts.
          </p>
        </div>
      </div>

      {/* Grid of 5 Communication Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {modules.map((mod) => (
          <div
            key={mod.id}
            className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
          >
            {/* Top Badge Overlay */}
            <div className="flex items-center justify-between mb-4">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg border ${mod.iconBg}`}>
                <i className={mod.icon}></i>
              </div>
              <span className="px-2.5 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-full text-[10px] font-bold tracking-wide uppercase">
                Coming Soon
              </span>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {mod.title}
                </h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                {mod.description}
              </p>

              {/* Feature Checklist */}
              <div className="pt-3 border-t border-gray-100 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Planned Architecture Capabilities
                </span>
                {mod.features.map((f, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[11px] text-gray-600">
                    <i className="fa-solid fa-check text-emerald-500 text-[10px] mt-0.5"></i>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Footer */}
            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-mono text-gray-400 truncate max-w-[170px]" title={mod.apiGateway}>
                <i className="fa-solid fa-network-wired mr-1"></i>
                {mod.apiGateway}
              </span>
              <button
                onClick={() => showNotification(mod.title)}
                className="px-3 py-1.5 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 border border-gray-200 hover:border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Configure</span>
                <i className="fa-solid fa-chevron-right text-[9px]"></i>
              </button>
            </div>
          </div>
        ))}

        {/* Integration Roadmap Card */}
        <div className="bg-gradient-to-br from-gray-900 to-slate-800 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="w-11 h-11 rounded-2xl bg-white/10 text-blue-300 border border-white/10 flex items-center justify-center text-lg mb-4">
              <i className="fa-solid fa-microchip"></i>
            </div>
            <h3 className="font-heading text-base font-bold text-white mb-2">
              Future API Integration Roadmap
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              The communication backend is designed with pluggable gateway adapters ready for external service hookups.
            </p>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <i className="fa-brands fa-whatsapp text-emerald-400"></i>
                <span>Meta WhatsApp Business API Gateway</span>
              </li>
              <li className="flex items-center gap-2">
                <i className="fa-solid fa-server text-blue-400"></i>
                <span>SMTP & Transactional Email Connectors</span>
              </li>
              <li className="flex items-center gap-2">
                <i className="fa-solid fa-robot text-purple-400"></i>
                <span>Scheduled Background Job Workers</span>
              </li>
              <li className="flex items-center gap-2">
                <i className="fa-solid fa-code text-amber-400"></i>
                <span>Dynamic Handlebars Template Compiler</span>
              </li>
            </ul>
          </div>
          <div className="pt-4 border-t border-white/10 mt-6 text-[10px] text-slate-400 font-mono">
            Status: Endpoints Ready (Pending Gateway Credentials)
          </div>
        </div>
      </div>
    </div>
  );
};
