import WhatsappConfigForm from "@/components/whatsapp/WhatsappConfigForm";

export default function WhatsappConfigPage() {
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configuração do WhatsApp</h1>
        <p className="text-muted-foreground">
          Configure a integração com a Evolution API para usar o WhatsApp no CRM.
        </p>
      </div>
      <div className="mx-auto max-w-3xl">
        <WhatsappConfigForm />
      </div>
    </div>
  );
}