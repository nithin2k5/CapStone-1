import { EmailTable } from "@/components/emails/EmailTable";

export default function EmailsPage() {
  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <span className="eyebrow">
          <span className="h-px w-6 bg-accent" />
          mail traffic
        </span>
        <h2 className="display mt-3 text-[1.7rem] text-foreground">Inbound email</h2>
        <p className="mt-1.5 max-w-2xl text-[14px] text-muted-foreground">
          Every message in your mailbox, read live from Gmail, with the gateway&apos;s risk score
          and verdict where it has scanned one. Open a scanned message to see the evidence behind
          the verdict.
        </p>
      </div>
      <EmailTable />
    </div>
  );
}
