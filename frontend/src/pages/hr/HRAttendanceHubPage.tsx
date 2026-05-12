import Layout from '../../components/Layout';
import HubTabs from '../../components/HubTabs';
import { useSearchParams } from 'react-router-dom';
import { HRClockHistoryContent } from './HRClockHistoryPage';
import { HRFlagsContent } from './HRFlagsPage';
import { HRLocationsContent } from './HRLocationsPage';
import { HRTokensContent } from './HRTokensPage';

const TABS = [
  { key: 'history', label: 'Attendance history' },
  { key: 'flags', label: 'Flagged Events' },
  { key: 'locations', label: 'Locations' },
  { key: 'tokens', label: 'Tokens' },
] as const;

type AttendanceTab = (typeof TABS)[number]['key'];

function isAttendanceTab(value: string | null): value is AttendanceTab {
  return TABS.some((tab) => tab.key === value);
}

export default function HRAttendanceHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: AttendanceTab = isAttendanceTab(tabParam) ? tabParam : 'history';

  function handleTabChange(tab: string) {
    const next = new URLSearchParams(searchParams);
    if (tab === 'history') next.delete('tab');
    else next.set('tab', tab);
    setSearchParams(next, { replace: true });
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-app">Attendance</h1>
          <p className="text-sm text-app-muted mt-0.5">
            Review attendance activity, investigate exceptions, manage approved locations, and handle token workflows.
          </p>
        </div>

        <HubTabs tabs={[...TABS]} activeTab={activeTab} onChange={handleTabChange} />

        {activeTab === 'history' && <HRClockHistoryContent />}
        {activeTab === 'flags' && <HRFlagsContent />}
        {activeTab === 'locations' && <HRLocationsContent />}
        {activeTab === 'tokens' && <HRTokensContent />}
      </div>
    </Layout>
  );
}
