import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MultiSelectOption {
  value: string | number
  label: string
}

interface MultiSelectProps extends React.HTMLAttributes<HTMLDivElement> {
  options: MultiSelectOption[]
  value: (string | number)[]
  onValueChange: (value: (string | number)[]) => void
  placeholder?: string
  disabled?: boolean
  maxTags?: number
}

const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(
  (
    {
      options,
      value,
      onValueChange,
      placeholder = 'Selecione opções...',
      disabled = false,
      maxTags,
      className,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [searchTerm, setSearchTerm] = React.useState('')
    const containerRef = React.useRef<HTMLDivElement>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Fechar dropdown ao clicar fora
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [isOpen])

    // Focus no input quando abre
    React.useEffect(() => {
      if (isOpen && inputRef.current) {
        inputRef.current.focus()
      }
    }, [isOpen])

    // Filtrar opções baseado no termo de busca
    const filteredOptions = options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !value.includes(opt.value)
    )

    // Obter labels das opções selecionadas
    const selectedLabels = value.map(
      (val) => options.find((opt) => opt.value === val)?.label || ''
    )

    // Toggle seleção de item
    const toggleOption = (optionValue: string | number) => {
      if (disabled) return

      let newValue: (string | number)[]
      if (value.includes(optionValue)) {
        newValue = value.filter((v) => v !== optionValue)
      } else {
        if (maxTags && value.length >= maxTags) return
        newValue = [...value, optionValue]
      }

      onValueChange(newValue)
    }

    // Remover tag específica
    const removeTag = (optionValue: string | number) => {
      if (disabled) return
      onValueChange(value.filter((v) => v !== optionValue))
    }

    // Limpar tudo
    const clearAll = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (disabled) return
      onValueChange([])
    }

    return (
      <div
        ref={containerRef}
        className={cn('relative w-full', className)}
        {...props}
      >
        {/* Botão/Container principal */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'w-full h-auto min-h-10 px-3 py-2 rounded-md border border-input bg-background',
            'text-sm ring-offset-background placeholder:text-muted-foreground',
            'flex flex-wrap items-center gap-2',
            'hover:bg-accent hover:text-accent-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            isOpen && 'ring-2 ring-ring ring-offset-2',
            disabled && 'bg-muted cursor-not-allowed'
          )}
        >
          {/* Tags com valores selecionados */}
          {value.length > 0 ? (
            selectedLabels.map((label, idx) => (
              <span
                key={value[idx]}
                className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-2.5 py-0.5 text-sm font-medium"
              >
                {label}
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      removeTag(value[idx])
                    }}
                    className="ml-1 inline-flex items-center rounded-full hover:bg-muted-foreground/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">{placeholder}</span>
          )}

          {/* Botão clear */}
          {!disabled && value.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                clearAll(e)
              }}
              className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-muted"
            >
              <X className="h-4 w-4 opacity-50 hover:opacity-100" />
            </button>
          )}
        </button>

        {/* Dropdown de opções */}
        {isOpen && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-input rounded-md shadow-md">
            {/* Input de busca */}
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                'w-full px-3 py-2 border-b border-input bg-background text-sm',
                'placeholder:text-muted-foreground focus:outline-none'
              )}
            />

            {/* Lista de opções */}
            <div className="max-h-64 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleOption(option.value)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      value.includes(option.value) &&
                        'bg-accent text-accent-foreground font-medium'
                    )}
                  >
                    {option.label}
                  </button>
                ))
              ) : (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {searchTerm
                    ? 'Nenhuma opção encontrada'
                    : 'Nenhuma opção disponível'}
                </div>
              )}
            </div>

            {/* Aviso de limite máximo */}
            {maxTags && value.length >= maxTags && (
              <div className="border-t border-input bg-muted px-3 py-2 text-xs text-muted-foreground">
                Máximo de {maxTags} itens selecionados
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
)

MultiSelect.displayName = 'MultiSelect'

export { MultiSelect }
