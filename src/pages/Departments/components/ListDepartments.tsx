import type { DepartmentDTO, DepartmentResponseDTO } from "@/api/departments";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable
} from "@tanstack/react-table";
import { Edit2, Filter, Search, Trash2, X } from "lucide-react";
import React, { useMemo, useState } from "react";

const PAGE_SIZE = 10

interface ListDepartmentsProps {
  departments: DepartmentResponseDTO[] | undefined;
  onDeleteDepartment: (departmentId: string) => void;
  setSelectedDepartment: React.Dispatch<React.SetStateAction<DepartmentResponseDTO | null>>;
}

const ListDepartments = ({ departments, onDeleteDepartment, setSelectedDepartment }: ListDepartmentsProps) => {
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const handleEdit = (department: DepartmentResponseDTO) => {
    const departmentDto: DepartmentDTO = {
      id: department.id,
      name: department.name,
      parentDepartmentId: department.parentDepartment?.id || undefined,
    }
    setSelectedDepartment(departmentDto);
  }

  const columnHelper = createColumnHelper<DepartmentResponseDTO>();

  const columns = [
    columnHelper.accessor("name", {
      header: "Nome",
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor((row) => row.parentDepartment?.name || "-", {
      id: "parentDepartment",
      header: "Departamento Pai",
      cell: (info) => <span>{info.getValue()}</span>,
    }),
    columnHelper.display({
      id: "actions",
      header: "Ações",
      cell: (info) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(info.row.original)}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <Edit2 size={18} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteDepartment(info.row.original.id)}
            className="text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 size={18} />
          </Button>
        </div>
      ),
    }),
  ];

  const filteredData = useMemo(() => {
    if (!departments) return [];
    if (!globalFilter) return departments;

    return departments.filter(dept =>
      dept.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
      dept.parentDepartment?.name.toLowerCase().includes(globalFilter.toLowerCase())
    );
  }, [departments, globalFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
  });

  const pageCount = Math.ceil((filteredData?.length ?? 0) / PAGE_SIZE);

  return (
    <div className="w-full mt-6">
      {/* Filtro */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800 rounded-xl p-6 border border-blue-200 dark:border-slate-700 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded"></div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Filter size={20} className="text-blue-500" />
            Buscar Departamentos
          </h3>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Buscar por nome ou departamento pai..."
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                setPagination({ pageIndex: 0, pageSize: PAGE_SIZE });
              }}
              className="w-full border rounded-lg px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-white dark:border-slate-700 transition-all"
            />
            <Search size={18} className="absolute left-3 top-3.5 text-gray-400" />
          </div>
          {globalFilter && (
            <button
              onClick={() => {
                setGlobalFilter("");
                setPagination({ pageIndex: 0, pageSize: PAGE_SIZE });
              }}
              className="px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Tabela */}
      {departments?.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-700">
          <p className="text-gray-500 dark:text-gray-400">Nenhum departamento cadastrado.</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-700">
          <p className="text-gray-500 dark:text-gray-400">Nenhum departamento encontrado para "{globalFilter}".</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  {table.getHeaderGroups().map((headerGroup) =>
                    headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={header.id === "actions" ? "text-right" : "text-left"}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </TableHead>
                    ))
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-b hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cell.column.id === "actions" ? "text-right" : "text-left py-4"}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          <div className="flex justify-center mt-8">
            <Pagination
              currentPage={pagination.pageIndex + 1}
              totalPages={pageCount}
              onPageChange={(page) => setPagination({ pageIndex: page - 1, pageSize: PAGE_SIZE })}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default ListDepartments;