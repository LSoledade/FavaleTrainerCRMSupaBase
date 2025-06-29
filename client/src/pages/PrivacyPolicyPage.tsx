import React from 'react';

const PrivacyPolicyPage: React.FC = () => (
  <div className="max-w-2xl mx-auto p-6 text-justify">
    <h1 className="text-2xl font-bold mb-4">Política de Privacidade</h1>
    <p className="mb-2 text-sm text-gray-500">Última atualização: 07/06/2024</p>
    <p className="mb-4">Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos as informações pessoais dos usuários do nosso CRM.</p>
    <h2 className="text-xl font-semibold mt-6 mb-2">1. Informações que coletamos</h2>
    <ul className="list-disc ml-6 mb-4">
      <li>Nome completo</li>
      <li>Endereço de e-mail</li>
      <li>Número de telefone</li>
      <li>Empresa/Organização</li>
      <li>Informações de contato de leads e clientes</li>
      <li>Dados inseridos manualmente no sistema (ex: anotações, tarefas, agendamentos)</li>
      <li>Dados de uso do sistema (logs de acesso, interações)</li>
    </ul>
    <h2 className="text-xl font-semibold mt-6 mb-2">2. Como usamos as informações</h2>
    <ul className="list-disc ml-6 mb-4">
      <li>Gerenciar e organizar contatos, leads e clientes</li>
      <li>Facilitar o agendamento de tarefas e compromissos</li>
      <li>Melhorar a experiência do usuário no CRM</li>
      <li>Enviar comunicações relacionadas ao uso do sistema</li>
      <li>Cumprir obrigações legais e regulatórias</li>
    </ul>
    <h2 className="text-xl font-semibold mt-6 mb-2">3. Compartilhamento de informações</h2>
    <p className="mb-4">Não compartilhamos informações pessoais com terceiros, exceto quando necessário para:</p>
    <ul className="list-disc ml-6 mb-4">
      <li>Cumprir obrigações legais</li>
      <li>Proteger nossos direitos e propriedade</li>
      <li>Fornecer funcionalidades essenciais do sistema (ex: integrações com WhatsApp, e-mail, etc.)</li>
    </ul>
    <h2 className="text-xl font-semibold mt-6 mb-2">4. Segurança das informações</h2>
    <p className="mb-4">Adotamos medidas técnicas e organizacionais para proteger os dados pessoais contra acesso não autorizado, alteração, divulgação ou destruição.</p>
    <h2 className="text-xl font-semibold mt-6 mb-2">5. Direitos dos titulares dos dados</h2>
    <p className="mb-4">Você pode solicitar, a qualquer momento:</p>
    <ul className="list-disc ml-6 mb-4">
      <li>Acesso aos seus dados pessoais</li>
      <li>Correção de informações incorretas</li>
      <li>Exclusão dos seus dados, quando aplicável</li>
      <li>Limitação ou oposição ao tratamento dos dados</li>
    </ul>
    <p className="mb-4">Para exercer seus direitos, entre em contato pelo e-mail: <a href="mailto:marketing@favalefisicosaude" className="text-blue-600 underline">marketing@favalefisicosaude</a></p>
    <h2 className="text-xl font-semibold mt-6 mb-2">6. Alterações nesta política</h2>
    <p className="mb-4">Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre alterações relevantes por meio do sistema ou por e-mail.</p>
    <h2 className="text-xl font-semibold mt-6 mb-2">7. Contato</h2>
    <p>Em caso de dúvidas sobre esta Política de Privacidade, entre em contato conosco pelo e-mail: <a href="mailto:marketing@favalefisicosaude" className="text-blue-600 underline">marketing@favalefisicosaude</a></p>
  </div>
);

export default PrivacyPolicyPage; 