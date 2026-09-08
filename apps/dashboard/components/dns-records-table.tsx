import { CopyButton } from "@workspace/ui/components/copy-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

interface DnsRecordsTableProps {
  records: Array<{ name: string; value: string }>;
}

/** DNS instructions shared by the account and newsletter domain views. */
export function DnsRecordsTable({ records }: DnsRecordsTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Type</TableHead>
            <TableHead>Host / Name</TableHead>
            <TableHead>Value / Target</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.name}>
              <TableCell className="font-mono text-xs">CNAME</TableCell>
              <TableCell>
                <div className="flex min-w-[18rem] items-start gap-1 font-mono text-xs">
                  <span className="min-w-0 flex-1 break-all">{record.name}</span>
                  <CopyButton content={record.name} size="sm" />
                </div>
              </TableCell>
              <TableCell>
                <div className="flex min-w-[22rem] items-start gap-1 font-mono text-xs">
                  <span className="min-w-0 flex-1 break-all">{record.value}</span>
                  <CopyButton content={record.value} size="sm" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
