import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sun, Moon, Sunrise, Coffee } from 'lucide-react';

export default function GreetingWidget() {
  const [greeting, setGreeting] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [icon, setIcon] = useState<JSX.Element>(<Coffee className="h-8 w-8 text-primary" />);
  
  // Busca os dados do usuário logado
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/user'],
  });
  
  // Define a saudação com base na hora do dia
  useEffect(() => {
    const updateGreeting = () => {
      const currentHour = new Date().getHours();
      
      if (currentHour >= 5 && currentHour < 12) {
        setGreeting('Bom dia');
        setWelcomeMessage('Comece seu dia com energia e foco!');
        setIcon(<Sunrise className="h-8 w-8 text-amber-500" />);
      } else if (currentHour >= 12 && currentHour < 18) {
        setGreeting('Boa tarde');
        setWelcomeMessage('Aproveite a produtividade da tarde!');
        setIcon(<Sun className="h-8 w-8 text-yellow-500" />);
      } else {
        setGreeting('Boa noite');
        setWelcomeMessage('Descanse bem após um dia produtivo!');
        setIcon(<Moon className="h-8 w-8 text-indigo-400" />);
      }
    };
    
    // Atualiza inicialmente
    updateGreeting();
    
    // Atualiza a cada minuto (para caso o usuário fique com a página aberta durante transições)
    const intervalId = setInterval(updateGreeting, 60000);
    
    // Limpeza ao desmontar
    return () => clearInterval(intervalId);
  }, []);
  
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-64" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="overflow-hidden border-primary-100 bg-gradient-to-br from-white to-primary-50 dark:from-gray-800 dark:to-primary-900/10 dark:border-primary-900">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900/30">
            {icon}
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
              {greeting}, {user?.username || 'usuário'}!
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {welcomeMessage}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}