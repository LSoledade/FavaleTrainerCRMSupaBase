import LeadManagement from "@/components/leads/LeadManagement";
import { LeadProvider } from "@/context/LeadContext";

export default function LeadsPage() {
  return (
    <LeadProvider>
      <LeadManagement />
    </LeadProvider>
  );
}
