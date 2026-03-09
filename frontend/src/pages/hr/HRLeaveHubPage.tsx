import Layout from '../../components/Layout';
import HubTabs from '../../components/HubTabs';
import { useSearchParams } from 'react-router-dom';
import { HRLeaveContent } from './HRLeavePage';
import { HRLeavePolicyContent } from './HRLeavePolicyPage';
import { HRHolidaysContent } from './HRHolidaysPage';
import { HRScheduleContent } from './HRSchedulePage';

const TABS = [
  { key: 'requests', label: 'Requests' },
  { key: 'policy', label: 'Policy' },
  { key: 'holidays', label: 'Holidays' },
  { key: 'schedule', label: 'Schedule' },
] as const;

type LeaveTab = (typeof TABS)[number]['key'];

function isLeaveTab(value: string | null): value is LeaveTab {
  return TABS.some((tab) => tab.key === value);
}

export default function HRLeaveHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: LeaveTab = isLeaveTab(tabParam) ? tabParam : 'requests';

  function handleTabChange(tab: string) {
    const next = new URLSearchParams(searchParams);
    if (tab === 'requests') next.delete('tab');
    else next.set('tab', tab);
    setSearchParams(next, { replace: true });
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage leave requests, policy settings, holidays, and schedule rules in one hub.
          </p>
        </div>

        <HubTabs tabs={[...TABS]} activeTab={activeTab} onChange={handleTabChange} />

        {activeTab === 'requests' && <HRLeaveContent />}
        {activeTab === 'policy' && <HRLeavePolicyContent />}
        {activeTab === 'holidays' && <HRHolidaysContent />}
        {activeTab === 'schedule' && <HRScheduleContent />}
      </div>
    </Layout>
  );
}
