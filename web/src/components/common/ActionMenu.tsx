"use client";

import * as React from "react";
import { useState } from "react";
import { MoreHorizontal, Edit, Trash2, Loader2, UserCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ActionMenuProps {
  onDelete?: () => Promise<{ success?: boolean; error?: string }>;
  onEdit?: () => void;
  editDialog?: React.ReactNode;
  title?: string;
  description?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  customActions?: React.ReactNode;
  studentId?: number;
}

export default function ActionMenu({ 
  onDelete, 
  onEdit, 
  editDialog, 
  title, 
  description, 
  canEdit = true, 
  canDelete = true, 
  customActions,
  studentId
}: ActionMenuProps) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    const result = await onDelete();
    setIsDeleting(false);
    if (result.success) {
      setIsAlertOpen(false);
    } else if (result.error) {
      alert(result.error);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <button className="h-8 w-8 p-0 hover:bg-slate-100 rounded-xl flex items-center justify-center border border-transparent transition-colors cursor-pointer outline-none">
            <MoreHorizontal className="h-5 w-5 text-slate-400" />
          </button>
        } />
        <DropdownMenuContent
          align="end"
          className="w-48 rounded-2xl p-2 shadow-xl border-slate-100 bg-white"
        >
          {canEdit && (
            onEdit ? (
              <DropdownMenuItem
                onClick={onEdit}
                className="flex items-center gap-2 p-3 rounded-xl cursor-pointer text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              >
                <Edit size={16} />
                <span className="font-semibold">Modifier</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => setIsEditDialogOpen(true)}
                className="flex items-center gap-2 p-3 rounded-xl cursor-pointer text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              >
                <Edit size={16} />
                <span className="font-semibold">Modifier</span>
              </DropdownMenuItem>
            )
          )}
          
          {studentId && (
            <DropdownMenuItem
              onClick={() => {
                window.location.href = `/dashboard/students/${studentId}/profile`;
              }}
              className="flex items-center gap-2 p-3 rounded-xl cursor-pointer hover:bg-indigo-50 text-slate-700 hover:text-indigo-650 transition-colors w-full text-left"
            >
              <UserCheck size={16} className="text-indigo-500" />
              <span className="font-semibold text-sm">Profil & Notes</span>
            </DropdownMenuItem>
          )}

          {customActions}

          {canDelete && (
            <DropdownMenuItem
              onClick={() => setIsAlertOpen(true)}
              className="flex items-center gap-2 p-3 rounded-xl cursor-pointer text-rose-500 hover:bg-rose-50 transition-colors"
            >
              <Trash2 size={16} />
              <span className="font-semibold">Supprimer</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {isEditDialogOpen && editDialog && React.isValidElement(editDialog) && (
        React.cloneElement(editDialog as React.ReactElement<any>, {
          open: isEditDialogOpen,
          onClose: () => setIsEditDialogOpen(false),
        })
      )}

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-slate-900">
              {title || "Êtes-vous sûr ?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-lg">
              {description || "Cette action est irréversible. Toutes les données associées seront supprimées."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-4">
            <AlertDialogCancel className="rounded-2xl px-6 py-3 border-slate-200 font-bold hover:bg-slate-50">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="rounded-2xl px-6 py-3 bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-lg shadow-rose-200 transition-all"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="animate-spin mr-2" size={18} />
              ) : (
                "Confirmer la suppression"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
