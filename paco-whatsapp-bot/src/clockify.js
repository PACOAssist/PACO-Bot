const axios = require('axios');

const REPORTS_BASE = 'https://reports.api.clockify.me/v1';

function headers() {
  return { 'X-Api-Key': process.env.CLOCKIFY_API_KEY };
}

/**
 * Formats a duration in seconds into a human-readable string (e.g. "3h 45m").
 */
function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '0h 0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * Returns a summary of hours logged for the client this month,
 * broken down by project.
 */
async function getClientSummary(workspaceId, clockifyClientId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const res = await axios.post(
    `${REPORTS_BASE}/workspaces/${workspaceId}/reports/summary`,
    {
      dateRangeStart: startOfMonth,
      dateRangeEnd: endOfMonth,
      summaryFilter: {
        groups: ['PROJECT'],
      },
      clients: {
        ids: [clockifyClientId],
      },
    },
    { headers: headers() }
  );

  const data = res.data;
  const totalSeconds = data.totals?.[0]?.totalTime ?? 0;

  const projects = (data.groupOne || []).map((project) => ({
    project: project.name,
    hoursLogged: formatDuration(project.duration ?? 0),
  }));

  return {
    period: now.toLocaleString('en-GB', { month: 'long', year: 'numeric' }),
    totalHoursLogged: formatDuration(totalSeconds),
    breakdown: projects,
  };
}

module.exports = { getClientSummary };
