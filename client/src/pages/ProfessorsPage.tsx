import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProfessorDialog } from "@/components/professors/ProfessorDialog";
import type { IProfessor } from "@/types";

export default function ProfessorsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProfessor, setSelectedProfessor] = useState<IProfessor | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch professors
  const { data: professors = [], isLoading, error } = useQuery({
    queryKey: ["/api/users/professors"],
    select: (data) => data as IProfessor[]
  });

  // Delete professor mutation
  const deleteProfessorMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/users/professors/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao excluir professor");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/professors"] });
      toast({
        title: "Professor excluído",
        description: "Professor excluído com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir professor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter professors based on search term
  const filteredProfessors = professors.filter((professor) =>
    professor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    professor.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    professor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditProfessor = (professor: IProfessor) => {
    setSelectedProfessor(professor);
    setIsDialogOpen(true);
  };

  const handleDeleteProfessor = (professor: IProfessor) => {
    if (confirm(`Tem certeza que deseja excluir o professor ${professor.name || professor.username}?`)) {
      deleteProfessorMutation.mutate(professor.id);
    }
  };

  const handleNewProfessor = () => {
    setSelectedProfessor(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedProfessor(null);
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Erro ao carregar professores: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Professores</h1>
            <p className="text-muted-foreground">
              Gerencie os professores e instrutores da academia
            </p>
          </div>
          <Button onClick={handleNewProfessor} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Professor
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, usuário ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Professores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{professors.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Professores Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {professors.filter(p => p.active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Especialidades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(professors.flatMap(p => p.specialties || [])).size}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Professors Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Professores</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Especialidades</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfessors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Nenhum professor encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProfessors.map((professor) => (
                      <TableRow key={professor.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{professor.name || professor.username}</div>
                            <div className="text-sm text-muted-foreground">
                              @{professor.username}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{professor.email || "-"}</TableCell>
                        <TableCell>{professor.phone || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {professor.specialties?.length ? (
                              professor.specialties.map((specialty) => (
                                <Badge key={specialty} variant="secondary" className="text-xs">
                                  {specialty}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={professor.active ? "default" : "secondary"}
                            className={professor.active ? "bg-green-500" : ""}
                          >
                            {professor.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditProfessor(professor)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteProfessor(professor)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Professor Dialog */}
      <ProfessorDialog
        professor={selectedProfessor}
        open={isDialogOpen}
        onClose={handleCloseDialog}
      />
    </div>
  );
}