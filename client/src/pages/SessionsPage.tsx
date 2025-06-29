import { SessionManagement } from '@/components/scheduling/SessionManagement';
import { Card, CardContent } from '@/components/ui/card';

export default function SessionsPage() {
  return (
    <div className="container mx-auto p-2 sm:p-4 lg:p-6">
      <Card className="w-full border-gray-100 dark:border-gray-700 shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-3 sm:p-6">
          <SessionManagement />
        </CardContent>
      </Card>
    </div>
  );
}
