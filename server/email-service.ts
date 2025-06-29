import { Session, Trainer } from '@shared/schema';
import { formatInTimeZone } from 'date-fns-tz';

// TODO: Implementar configuração de e-mail quando as credenciais estiverem disponíveis
// import nodemailer from 'nodemailer';
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASSWORD,
//   },
// });

// Função de log para usar durante o desenvolvimento
function logEmailContent(subject: string, recipient: string, content: string) {
  console.log(`---------- E-MAIL SIMULADO ----------`);
  console.log(`Para: ${recipient}`);
  console.log(`Assunto: ${subject}`);
  console.log(`Conteúdo: ${content.substring(0, 100)}...`);
  console.log(`------------------------------------`);
}

/**
 * Envia e-mail de confirmação de agendamento para o aluno e professor
 */
export async function sendSessionConfirmationEmail(
  session: Session,
  trainerName: string,
  trainerEmail: string,
  studentName: string,
  studentEmail: string
): Promise<boolean> {
  try {
    const startTime = formatInTimeZone(
      session.startTime instanceof Date ? session.startTime : new Date(session.startTime),
      'America/Sao_Paulo',
      "dd/MM/yyyy 'às' HH:mm"
    );

    const endTime = formatInTimeZone(
      session.endTime instanceof Date ? session.endTime : new Date(session.endTime),
      'America/Sao_Paulo',
      "HH:mm"
    );

    // TODO: Implementar envio real de e-mails quando as credenciais estiverem disponíveis
    // Email para o aluno
    const studentEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid ${session.source === 'Favale' ? '#0057b7' : '#FF69B4'}; border-radius: 5px;">
        <h2 style="color: ${session.source === 'Favale' ? '#0057b7' : '#FF69B4'}; text-align: center;">${session.source} Personal Training</h2>
        <h3>Confirmação de Agendamento</h3>
        <p>Olá, <strong>${studentName}</strong>!</p>
        <p>Seu treino foi agendado com sucesso.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Data e Hora:</strong> ${startTime} até ${endTime}</p>
          <p><strong>Local:</strong> ${session.location}</p>
          <p><strong>Professor:</strong> ${trainerName}</p>
          ${session.notes ? `<p><strong>Observações:</strong> ${session.notes}</p>` : ''}
        </div>
        <p>Por favor, chegue com alguns minutos de antecedência.</p>
        <p>Em caso de imprevistos ou necessidade de cancelamento, por favor entre em contato com no mínimo 24 horas de antecedência.</p>
        <p>Atenciosamente,<br>Equipe ${session.source} Personal Training</p>
      </div>
    `;
    
    logEmailContent(
      `Confirmação de Agendamento - ${session.source} Personal Training`,
      studentEmail,
      studentEmailContent
    );

    // Email para o professor
    const trainerEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid ${session.source === 'Favale' ? '#0057b7' : '#FF69B4'}; border-radius: 5px;">
        <h2 style="color: ${session.source === 'Favale' ? '#0057b7' : '#FF69B4'}; text-align: center;">${session.source} Personal Training</h2>
        <h3>Novo Agendamento</h3>
        <p>Olá, <strong>${trainerName}</strong>!</p>
        <p>Uma nova sessão de treino foi agendada para você.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Aluno:</strong> ${studentName}</p>
          <p><strong>Data e Hora:</strong> ${startTime} até ${endTime}</p>
          <p><strong>Local:</strong> ${session.location}</p>
          ${session.notes ? `<p><strong>Observações:</strong> ${session.notes}</p>` : ''}
        </div>
        <p>Este agendamento já foi adicionado ao seu calendário do Google.</p>
        <p>Atenciosamente,<br>Equipe ${session.source} Personal Training</p>
      </div>
    `;
    
    logEmailContent(
      `Novo Agendamento - ${studentName}`,
      trainerEmail,
      trainerEmailContent
    );

    return true;
  } catch (error) {
    console.error('Erro ao enviar email de confirmação:', error);
    return false;
  }
}

/**
 * Envia e-mail de cancelamento de sessão
 */
export async function sendSessionCancellationEmail(
  session: Session,
  trainerName: string,
  trainerEmail: string,
  studentName: string,
  studentEmail: string,
  cancellationReason?: string
): Promise<boolean> {
  try {
    const startTime = formatInTimeZone(
      session.startTime instanceof Date ? session.startTime : new Date(session.startTime),
      'America/Sao_Paulo',
      "dd/MM/yyyy 'às' HH:mm"
    );

    // TODO: Implementar envio real de e-mails quando as credenciais estiverem disponíveis
    // Email para o aluno
    const studentEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid ${session.source === 'Favale' ? '#0057b7' : '#FF69B4'}; border-radius: 5px;">
        <h2 style="color: ${session.source === 'Favale' ? '#0057b7' : '#FF69B4'}; text-align: center;">${session.source} Personal Training</h2>
        <h3>Cancelamento de Agendamento</h3>
        <p>Olá, <strong>${studentName}</strong>!</p>
        <p>Informamos que sua sessão de treinamento foi <strong>cancelada</strong>.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Data e Hora:</strong> ${startTime}</p>
          <p><strong>Local:</strong> ${session.location}</p>
          <p><strong>Professor:</strong> ${trainerName}</p>
          ${cancellationReason ? `<p><strong>Motivo do cancelamento:</strong> ${cancellationReason}</p>` : ''}
        </div>
        <p>Entre em contato conosco para reagendar sua sessão.</p>
        <p>Atenciosamente,<br>Equipe ${session.source} Personal Training</p>
      </div>
    `;
    
    logEmailContent(
      `Cancelamento de Agendamento - ${session.source} Personal Training`,
      studentEmail,
      studentEmailContent
    );

    // Email para o professor
    const trainerEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid ${session.source === 'Favale' ? '#0057b7' : '#FF69B4'}; border-radius: 5px;">
        <h2 style="color: ${session.source === 'Favale' ? '#0057b7' : '#FF69B4'}; text-align: center;">${session.source} Personal Training</h2>
        <h3>Sessão Cancelada</h3>
        <p>Olá, <strong>${trainerName}</strong>!</p>
        <p>Informamos que a seguinte sessão de treinamento foi <strong>cancelada</strong>:</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Aluno:</strong> ${studentName}</p>
          <p><strong>Data e Hora:</strong> ${startTime}</p>
          <p><strong>Local:</strong> ${session.location}</p>
          ${cancellationReason ? `<p><strong>Motivo do cancelamento:</strong> ${cancellationReason}</p>` : ''}
        </div>
        <p>Este cancelamento já foi atualizado em seu calendário do Google.</p>
        <p>Atenciosamente,<br>Equipe ${session.source} Personal Training</p>
      </div>
    `;
    
    logEmailContent(
      `Sessão Cancelada - ${studentName}`,
      trainerEmail,
      trainerEmailContent
    );

    return true;
  } catch (error) {
    console.error('Erro ao enviar email de cancelamento:', error);
    return false;
  }
}

/**
 * Envia e-mail de lembrete para sessão agendada
 */
export async function sendSessionReminderEmail(
  session: Session,
  trainerName: string,
  studentName: string,
  studentEmail: string
): Promise<boolean> {
  try {
    const startTime = formatInTimeZone(
      session.startTime instanceof Date ? session.startTime : new Date(session.startTime),
      'America/Sao_Paulo',
      "dd/MM/yyyy 'às' HH:mm"
    );

    const endTime = formatInTimeZone(
      session.endTime instanceof Date ? session.endTime : new Date(session.endTime),
      'America/Sao_Paulo',
      "HH:mm"
    );

    // TODO: Implementar envio real de e-mails quando as credenciais estiverem disponíveis
    // Email de lembrete para o aluno
    const reminderEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid ${session.source === 'Favale' ? '#0057b7' : '#FF69B4'}; border-radius: 5px;">
        <h2 style="color: ${session.source === 'Favale' ? '#0057b7' : '#FF69B4'}; text-align: center;">${session.source} Personal Training</h2>
        <h3>Lembrete de Treino</h3>
        <p>Olá, <strong>${studentName}</strong>!</p>
        <p>Este é um lembrete para o seu treino amanhã:</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Data e Hora:</strong> ${startTime} até ${endTime}</p>
          <p><strong>Local:</strong> ${session.location}</p>
          <p><strong>Professor:</strong> ${trainerName}</p>
          ${session.notes ? `<p><strong>Observações:</strong> ${session.notes}</p>` : ''}
        </div>
        <p>Por favor, chegue com alguns minutos de antecedência.</p>
        <p>Em caso de imprevistos ou necessidade de cancelamento, por favor entre em contato com urgência.</p>
        <p>Atenciosamente,<br>Equipe ${session.source} Personal Training</p>
      </div>
    `;
    
    logEmailContent(
      `Lembrete: Seu treino amanhã - ${session.source} Personal Training`,
      studentEmail,
      reminderEmailContent
    );

    return true;
  } catch (error) {
    console.error('Erro ao enviar email de lembrete:', error);
    return false;
  }
}

/**
 * Envia e-mail de notificação de reagendamento
 */
export async function sendSessionRescheduledEmail(
  oldSession: Session,
  newSession: Session,
  trainerName: string,
  trainerEmail: string,
  studentName: string,
  studentEmail: string
): Promise<boolean> {
  try {
    const oldStartTime = formatInTimeZone(
      oldSession.startTime instanceof Date ? oldSession.startTime : new Date(oldSession.startTime),
      'America/Sao_Paulo',
      "dd/MM/yyyy 'às' HH:mm"
    );

    const newStartTime = formatInTimeZone(
      newSession.startTime instanceof Date ? newSession.startTime : new Date(newSession.startTime),
      'America/Sao_Paulo',
      "dd/MM/yyyy 'às' HH:mm"
    );

    const newEndTime = formatInTimeZone(
      newSession.endTime instanceof Date ? newSession.endTime : new Date(newSession.endTime),
      'America/Sao_Paulo',
      "HH:mm"
    );

    // TODO: Implementar envio real de e-mails quando as credenciais estiverem disponíveis
    // Email para o aluno
    const studentEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid ${newSession.source === 'Favale' ? '#0057b7' : '#FF69B4'}; border-radius: 5px;">
        <h2 style="color: ${newSession.source === 'Favale' ? '#0057b7' : '#FF69B4'}; text-align: center;">${newSession.source} Personal Training</h2>
        <h3>Sessão Reagendada</h3>
        <p>Olá, <strong>${studentName}</strong>!</p>
        <p>Sua sessão de treinamento foi <strong>reagendada</strong>:</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Data e Hora Original:</strong> ${oldStartTime}</p>
          <p><strong>Nova Data e Hora:</strong> ${newStartTime} até ${newEndTime}</p>
          <p><strong>Local:</strong> ${newSession.location}</p>
          <p><strong>Professor:</strong> ${trainerName}</p>
          ${newSession.notes ? `<p><strong>Observações:</strong> ${newSession.notes}</p>` : ''}
        </div>
        <p>Por favor, confirme se o novo horário funciona para você. Caso contrário, entre em contato conosco.</p>
        <p>Atenciosamente,<br>Equipe ${newSession.source} Personal Training</p>
      </div>
    `;
    
    logEmailContent(
      `Sessão Reagendada - ${newSession.source} Personal Training`,
      studentEmail,
      studentEmailContent
    );

    // Email para o professor
    const trainerEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid ${newSession.source === 'Favale' ? '#0057b7' : '#FF69B4'}; border-radius: 5px;">
        <h2 style="color: ${newSession.source === 'Favale' ? '#0057b7' : '#FF69B4'}; text-align: center;">${newSession.source} Personal Training</h2>
        <h3>Sessão Reagendada</h3>
        <p>Olá, <strong>${trainerName}</strong>!</p>
        <p>Uma sessão de treinamento foi <strong>reagendada</strong>:</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Aluno:</strong> ${studentName}</p>
          <p><strong>Data e Hora Original:</strong> ${oldStartTime}</p>
          <p><strong>Nova Data e Hora:</strong> ${newStartTime} até ${newEndTime}</p>
          <p><strong>Local:</strong> ${newSession.location}</p>
          ${newSession.notes ? `<p><strong>Observações:</strong> ${newSession.notes}</p>` : ''}
        </div>
        <p>Esta alteração já foi atualizada em seu calendário do Google.</p>
        <p>Atenciosamente,<br>Equipe ${newSession.source} Personal Training</p>
      </div>
    `;
    
    logEmailContent(
      `Sessão Reagendada - ${studentName}`,
      trainerEmail,
      trainerEmailContent
    );

    return true;
  } catch (error) {
    console.error('Erro ao enviar email de reagendamento:', error);
    return false;
  }
}
