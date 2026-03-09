import Layout from '../../components/Layout';
import HubTabs from '../../components/HubTabs';
import { useSearchParams } from 'react-router-dom';
import { HREmployeesContent } from './HREmployeesPage';
import { HRDepartmentsContent } from './HRDepartmentsPage';

const TABS = [
  { key: 'employees', label: 'Employees' },
  { key: 'departments', label: 'Departments' },
] as const;

type WorkforceTab = (typeof TABS)[number]['key'];

function isWorkforceTab(value: string | null): value is WorkforceTab {
  return TABS.some((tab) => tab.key === value);
}

export default function HRWorkforceHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: WorkforceTab = isWorkforceTab(tabParam) ? tabParam : 'employees';

  function handleTabChange(tab: string) {
    const next = new URLSearchParams(searchParams);
    if (tab === 'employees') next.delete('tab');
    else next.set('tab', tab);
    setSearchParams(next, { replace: true });
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workforce</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage employees and the departments they belong to from one place.
          </p>
        </div>

        <HubTabs tabs={[...TABS]} activeTab={activeTab} onChange={handleTabChange} />

        {activeTab === 'employees' ? <HREmployeesContent /> : <HRDepartmentsContent />}
      </div>
    </Layout>
  );
}
