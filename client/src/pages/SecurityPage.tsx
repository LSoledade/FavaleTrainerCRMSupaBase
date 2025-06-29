import React from 'react';
import Layout from "@/components/Layout";
import AuditLogViewer from "@/components/admin/AuditLogViewer";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, FileLock, AlertTriangle, Lock } from "lucide-react";

export default function SecurityPage() {
  const { user } = useAuth();
  
  // Verificar se o usuário é administrador
  if (!user || user.role !== "admin") {
    return <Redirect to="/" />;
  }

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <div className="flex items-center mb-6">
          <Shield className="h-8 w-8 mr-2 text-primary" />
          <h1 className="text-3xl font-bold">Segurança e Privacidade</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center">
                <FileLock className="h-5 w-5 mr-2 text-primary" />
                <CardTitle>Logs de Auditoria</CardTitle>
              </div>
              <CardDescription>
                Rastreamento das ações realizadas no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Os logs registram eventos importantes como logins, modificações de dados e exclusões, permitindo rastrear ações e detectar problemas de segurança.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center">
                <Lock className="h-5 w-5 mr-2 text-primary" />
                <CardTitle>Criptografia de Dados</CardTitle>
              </div>
              <CardDescription>
                Proteção de informações sensíveis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Todas as senhas são armazenadas com criptografia de alto nível (scrypt) e salting, e as conexões com o banco de dados são protegidas com SSL.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-primary" />
                <CardTitle>Controle de Acesso</CardTitle>
              </div>
              <CardDescription>
                Gerenciamento de permissões por perfil
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                O sistema implementa controle de acesso baseado em papéis (RBAC), garantindo que apenas usuários autorizados possam acessar áreas e funções específicas.
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="audit-logs" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="audit-logs">Logs de Auditoria</TabsTrigger>
            <TabsTrigger value="privacy-policy">Política de Privacidade</TabsTrigger>
            <TabsTrigger value="security-settings">Configurações de Segurança</TabsTrigger>
          </TabsList>
          
          <TabsContent value="audit-logs">
            <AuditLogViewer />
          </TabsContent>
          
          <TabsContent value="privacy-policy">
            <Card>
              <CardHeader>
                <CardTitle>Política de Privacidade</CardTitle>
                <CardDescription>
                  Como o sistema protege os dados dos usuários e alunos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Coleta de Dados</h3>
                  <p>
                    A Favale & Pink coleta apenas as informações necessárias para o gerenciamento de leads e alunos. 
                    Estes dados incluem nome, e-mail, telefone, estado e informações relacionadas às campanhas e interesses.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Uso dos Dados</h3>
                  <p>
                    As informações coletadas são utilizadas exclusivamente para:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Gerenciar os contatos e relacionamentos com leads e alunos</li>
                    <li>Enviar informações relevantes sobre serviços e treinamentos</li>
                    <li>Melhorar a qualidade dos serviços oferecidos</li>
                    <li>Gerar relatórios e estatísticas internos</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Proteção de Dados</h3>
                  <p>
                    Implementamos diversas medidas de segurança para proteger as informações armazenadas:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Criptografia de dados sensíveis</li>
                    <li>Controle de acesso baseado em funções</li>
                    <li>Auditoria e monitoramento de atividades</li>
                    <li>Backups regulares e proteção contra perda de dados</li>
                    <li>Conexões seguras com o banco de dados</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Compartilhamento</h3>
                  <p>
                    A Favale & Pink não compartilha dados pessoais com terceiros, exceto quando necessário para a prestação dos serviços ou quando exigido por lei.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Direitos dos Usuários</h3>
                  <p>
                    Os titulares dos dados têm direito a:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Acessar seus dados pessoais</li>
                    <li>Solicitar a correção de informações incorretas</li>
                    <li>Solicitar a exclusão de seus dados</li>
                    <li>Revogar o consentimento para tratamento dos dados</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="security-settings">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Segurança</CardTitle>
                <CardDescription>
                  Configurações avançadas de segurança do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Informações do Ambiente</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-md bg-gray-50 dark:bg-gray-800">
                        <p className="text-sm font-medium mb-1">Ambiente</p>
                        <p className="text-sm">{process.env.NODE_ENV === 'production' ? 'Produção' : 'Desenvolvimento'}</p>
                      </div>
                      <div className="p-4 rounded-md bg-gray-50 dark:bg-gray-800">
                        <p className="text-sm font-medium mb-1">Conexão Segura (HTTPS)</p>
                        <p className="text-sm">{process.env.NODE_ENV === 'production' ? 'Ativada' : 'Desativada em desenvolvimento'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Políticas de Segurança</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Senhas devem conter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais</li>
                      <li>Tempo de expiração da sessão: 24 horas</li>
                      <li>Restrição de acesso a áreas administrativas baseada em papéis (RBAC)</li>
                      <li>Auditoria de todas as ações sensíveis realizadas no sistema</li>
                      <li>Proteção contra ataques CSRF através de cookies SameSite</li>
                      <li>Cookies HttpOnly para evitar acesso por JavaScript</li>
                      <li>Validação de entrada em todos os campos do formulário</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
