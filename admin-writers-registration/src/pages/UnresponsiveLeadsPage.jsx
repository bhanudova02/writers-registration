import LeadTable from "../components/custom/LeadTable";

export default function UnresponsiveLeadsPage() {
    return <LeadTable title="Unresponsive Leads" params={{ status: 'Unresponse' }} />;
}
