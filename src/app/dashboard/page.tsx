'use client';

// Dashboard page with new layout components
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { useCurrentUser } from '@/components/ProtectedRoute';

function DashboardContent() {
  const user = useCurrentUser();

  const stats = [
    {
      name: 'Active Claims',
      value: '3',
      icon: '📋',
      color: 'bg-blue-500',
    },
    {
      name: 'Pending Approvals',
      value: '1',
      icon: '⏳',
      color: 'bg-yellow-500',
    },
    {
      name: 'Completed Claims',
      value: '12',
      icon: '✅',
      color: 'bg-green-500',
    },
    {
      name: 'Total Reimbursed',
      value: '$2,450',
      icon: '💰',
      color: 'bg-purple-500',
    },
  ];

  const recentActivity = [
    {
      id: 1,
      action: 'Claim submitted',
      description: 'Annual physical exam - Dr. Smith',
      time: '2 hours ago',
      status: 'processing',
    },
    {
      id: 2,
      action: 'Payment received',
      description: 'Dental cleaning - City Dental',
      time: '1 day ago',
      status: 'completed',
    },
    {
      id: 3,
      action: 'Claim approved',
      description: 'Eye exam - Vision Center',
      time: '3 days ago',
      status: 'approved',
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title={`Welcome back, ${user?.name || 'User'}!`}
        description="Here's an overview of your insurance claims and activity."
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.name} className="hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-lg ${stat.color} text-white`}>
                  <span className="text-xl">{stat.icon}</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card
            title="Quick Actions"
            description="Common tasks to get you started"
          >
            <div className="space-y-3">
              <button className="w-full flex items-center p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <span className="text-blue-600 text-xl mr-3">📋</span>
                <div>
                  <p className="font-medium text-blue-900">Submit New Claim</p>
                  <p className="text-sm text-blue-700">Upload receipts and create a claim</p>
                </div>
              </button>
              
              <button className="w-full flex items-center p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                <span className="text-green-600 text-xl mr-3">🏥</span>
                <div>
                  <p className="font-medium text-green-900">Update Insurance</p>
                  <p className="text-sm text-green-700">Manage your insurance information</p>
                </div>
              </button>
              
              <button className="w-full flex items-center p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                <span className="text-purple-600 text-xl mr-3">📄</span>
                <div>
                  <p className="font-medium text-purple-900">View Documents</p>
                  <p className="text-sm text-purple-700">Access your uploaded files</p>
                </div>
              </button>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card
            title="Recent Activity"
            description="Your latest claim updates"
            action={
              <button className="text-sm text-blue-600 hover:text-blue-800">
                View all
              </button>
            }
          >
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                    activity.status === 'completed' ? 'bg-green-500' :
                    activity.status === 'approved' ? 'bg-blue-500' :
                    'bg-yellow-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.action}
                    </p>
                    <p className="text-sm text-gray-600">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Tips and Help */}
        <Card
          title="Getting Started"
          description="Tips to help you make the most of ClaimFlow"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <span className="text-2xl mb-2 block">📱</span>
              <h4 className="font-medium text-gray-900 mb-1">Upload Documents</h4>
              <p className="text-sm text-gray-600">
                Use your phone to scan insurance cards and receipts
              </p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <span className="text-2xl mb-2 block">🤖</span>
              <h4 className="font-medium text-gray-900 mb-1">AI Assistance</h4>
              <p className="text-sm text-gray-600">
                Get help with medical codes and claim validation
              </p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <span className="text-2xl mb-2 block">🔒</span>
              <h4 className="font-medium text-gray-900 mb-1">Secure & Private</h4>
              <p className="text-sm text-gray-600">
                Your health information is encrypted and protected
              </p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}