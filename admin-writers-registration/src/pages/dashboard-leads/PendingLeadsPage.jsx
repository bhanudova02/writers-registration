import LeadTable from "../../components/custom/LeadTable";

export default function PendingLeadsPage() {
    return <LeadTable title="Pending Leads" params={{ status: 'Pending' }} />;
}
