// Template-based prep brief generation (no AI required)

interface Deal {
  account_name: string;
  deal_value: number;
  currency: string;
  stage: string;
  expected_close_month: string;
}

interface Stakeholder {
  name: string;
  role_title: string;
  department: string | null;
  stance: string | null;
  power: string | null;
  communication_style: string | null;
}

interface Meeting {
  title: string;
  meeting_date: string;
  raw_notes: string;
  risks?: Array<{ risk_description: string; severity: string }>;
}

export interface PrepBriefData {
  executive_summary: string;
  stakeholder_summary: Array<{
    name: string;
    role: string;
    stance: string;
    key_point: string;
  }>;
  risks_to_address: Array<{
    risk: string;
    severity: string;
    mitigation: string;
  }>;
  last_meeting_key_takeaways: string[];
  recommended_questions: Array<{
    question: string;
    purpose: string;
    stakeholder?: string;
  }>;
  meeting_objectives: string[];
  prep_notes: string[];
}

/**
 * Generate prep brief from data - no AI required
 */
export function generatePrepBrief(
  deal: Deal,
  stakeholders: Stakeholder[],
  recentMeetings: Meeting[]
): PrepBriefData {
  // Sort stakeholders by power
  const sortedStakeholders = [...stakeholders].sort((a, b) => {
    const powerOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const aPower = powerOrder[a.power?.toLowerCase() || ''] || 0;
    const bPower = powerOrder[b.power?.toLowerCase() || ''] || 0;
    return bPower - aPower;
  });

  // Aggregate all risks from recent meetings
  const allRisks = recentMeetings
    .flatMap(m => m.risks || [])
    .slice(0, 5);

  // Extract key takeaways from last meeting notes
  const lastMeetingTakeaways = recentMeetings[0]?.raw_notes
    ? recentMeetings[0].raw_notes
        .split('\n')
        .filter(line => line.trim().length > 30)
        .slice(0, 3)
        .map(line => line.trim())
    : [];

  // Format currency
  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: deal.currency
  }).format(deal.deal_value);

  // Format close date
  const closeDate = new Date(deal.expected_close_month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return {
    executive_summary: `Preparing for upcoming meeting with ${deal.account_name}. The deal is currently in the ${deal.stage} stage, valued at ${formattedValue}, with an expected close date of ${closeDate}. ${stakeholders.length} key stakeholder${stakeholders.length !== 1 ? 's have' : ' has'} been identified${recentMeetings.length > 0 ? ` across ${recentMeetings.length} recorded meeting${recentMeetings.length !== 1 ? 's' : ''}` : ''}.`,

    meeting_objectives: [
      `Advance the deal from ${deal.stage} stage toward close`,
      'Address any outstanding concerns or objections',
      'Establish clear next steps and timeline',
      'Strengthen relationships with key decision-makers'
    ],

    stakeholder_summary: sortedStakeholders.slice(0, 8).map(s => ({
      name: s.name,
      role: s.role_title,
      stance: s.stance || 'Unknown',
      key_point: s.communication_style ||
        `${s.role_title}${s.department ? ' in ' + s.department : ''}. ${s.power ? s.power.charAt(0).toUpperCase() + s.power.slice(1) + ' influence.' : 'Influence level unknown.'}`
    })),

    risks_to_address: allRisks.map(r => ({
      risk: r.risk_description,
      severity: r.severity,
      mitigation: r.severity === 'high'
        ? 'Address immediately in next meeting'
        : r.severity === 'medium'
        ? 'Monitor and prepare response strategy'
        : 'Keep on radar, address if raised'
    })),

    last_meeting_key_takeaways: lastMeetingTakeaways.length > 0
      ? lastMeetingTakeaways
      : recentMeetings[0]
      ? [`Last meeting: ${recentMeetings[0].title} on ${new Date(recentMeetings[0].meeting_date).toLocaleDateString()}`]
      : ['No previous meetings recorded'],

    recommended_questions: [
      {
        question: 'What are your key criteria for evaluating solutions like ours?',
        purpose: 'Understand decision-making factors and priorities',
        stakeholder: sortedStakeholders[0]?.name || 'Key decision-maker'
      },
      {
        question: 'Who else needs to be involved in this decision process?',
        purpose: 'Map the complete buying committee',
        stakeholder: sortedStakeholders[0]?.name || 'Primary contact'
      },
      {
        question: 'What would success look like in the first 90 days?',
        purpose: 'Align on outcomes and expectations',
        stakeholder: sortedStakeholders.find(s =>
          s.role_title?.toLowerCase().includes('vp') ||
          s.role_title?.toLowerCase().includes('director')
        )?.name || 'Technical lead'
      },
      {
        question: `What concerns do you have about moving from ${deal.stage} to close?`,
        purpose: 'Proactively address potential objections',
        stakeholder: sortedStakeholders[0]?.name || 'Any stakeholder'
      }
    ],

    prep_notes: [
      'Review all stakeholder profiles and their preferences',
      allRisks.length > 0
        ? `Prepare responses for ${allRisks.length} identified risk${allRisks.length !== 1 ? 's' : ''}`
        : 'No critical risks currently identified',
      recentMeetings.length > 0
        ? 'Reference insights from previous meetings'
        : 'This will be an early-stage conversation',
      'Have relevant case studies and success metrics ready',
      `Confirm agenda aligns with ${deal.stage} stage goals`
    ]
  };
}
