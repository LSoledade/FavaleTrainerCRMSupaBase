import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { User, Mail, Phone, CreditCard, Shield, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { IProfessor } from "@/types";

// Form validation schema
const professorFormSchema = z.object({
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  password: z.string().optional(),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  specialty: z.string().optional(),
  bio: z.string().optional(),
  hourlyRate: z.number().min(0, "Taxa horária deve ser maior ou igual a zero").optional(),
  active: z.boolean().default(true),
});

type ProfessorFormData = z.infer<typeof professorFormSchema>;

interface ProfessorDialogProps {
  professor?: IProfessor | null;
  open: boolean;
  onClose: () => void;
}

export function ProfessorDialog({ professor, open, onClose }: ProfessorDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!professor;

  const form = useForm<ProfessorFormData>({
    resolver: zodResolver(professorFormSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      phone: "",
      address: "",
      specialty: "",
      bio: "",
      hourlyRate: 0,
      active: true,
    },
  });

  // Reset form when professor changes
  useEffect(() => {
    if (professor && open) {
      form.reset({
        username: professor.username || "",
        password: "", // Don't show existing password
        name: professor.name || "",
        email: professor.email || "",
        phone: professor.phone || "",
        address: professor.address || "",
        specialty: professor.specialty || "",
        bio: professor.bio || "",
        hourlyRate: professor.hourlyRate ? professor.hourlyRate / 100 : 0, // Convert from cents
        active: professor.active ?? true,
      });
    } else if (!professor && open) {
      form.reset({
        username: "",
        password: "",
        name: "",
        email: "",
        phone: "",
        address: "",
        specialty: "",
        bio: "",
        hourlyRate: 0,
        active: true,
      });
    }
  }, [professor, open, form]);

  // Create professor mutation
  const createProfessorMutation = useMutation({
    mutationFn: async (data: ProfessorFormData) => {
      const response = await fetch("/api/users/professors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: data.username,
          password: data.password,
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          specialty: data.specialty || null,
          bio: data.bio || null,
          hourlyRate: data.hourlyRate ? Math.round(data.hourlyRate * 100) : null, // Convert to cents
          active: data.active,
          role: "professor",
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar professor");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/professors"] });
      toast({
        title: "Professor criado",
        description: "Professor criado com sucesso",
      });
      onClose();
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar professor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update professor mutation
  const updateProfessorMutation = useMutation({
    mutationFn: async (data: ProfessorFormData) => {
      const updateData: any = {
        username: data.username,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        specialty: data.specialty || null,
        bio: data.bio || null,
        hourlyRate: data.hourlyRate ? Math.round(data.hourlyRate * 100) : null, // Convert to cents
        active: data.active,
      };

      // Only include password if it's provided
      if (data.password && data.password.trim() !== "") {
        updateData.password = data.password;
      }

      const response = await fetch(`/api/users/professors/${professor!.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao atualizar professor");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/professors"] });
      toast({
        title: "Professor atualizado",
        description: "Professor atualizado com sucesso",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar professor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfessorFormData) => {
    if (isEditing) {
      updateProfessorMutation.mutate(data);
    } else {
      createProfessorMutation.mutate(data);
    }
  };

  const isLoading = createProfessorMutation.isPending || updateProfessorMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isEditing ? "Editar Professor" : "Novo Professor"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Username *
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Digite o username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {isEditing ? "Nova Senha (opcional)" : "Senha *"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder={isEditing ? "Deixe em branco para manter atual" : "Digite a senha"}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Digite o nome completo" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="professor@exemplo.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Telefone
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="(11) 99999-9999" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Endereço
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Digite o endereço completo" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Professional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="specialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especialidade</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Personal Trainer, Pilates..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Taxa Horária (R$)
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Bio */}
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Biografia</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Digite uma breve biografia do professor..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active Status */}
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Professor Ativo</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Desmarque para desativar temporariamente o professor
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : isEditing ? "Atualizar" : "Criar Professor"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}