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
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)
    const optionsRef = React.useRef<HTMLDivElement>(null)

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
        setHighlightedIndex(-1)
      }
    }, [isOpen])

    // Scroll para item destacado
    React.useEffect(() => {
      if (highlightedIndex >= 0 && optionsRef.current) {
        const highlightedElement = optionsRef.current.children[highlightedIndex] as HTMLElement
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }
    }, [highlightedIndex])

    // Handler de teclado para navegação com setas
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault()
          setIsOpen(true)
          setHighlightedIndex(0)
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          )
          break

        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          )
          break

        case 'Enter':
          e.preventDefault()
          if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
            toggleOption(filteredOptions[highlightedIndex].value)
            setHighlightedIndex(-1)
          }
          break

        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          setHighlightedIndex(-1)
          break

        case 'Tab':
          setIsOpen(false)
          setHighlightedIndex(-1)
          break

        default:
          break
      }
    }

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
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              !disabled && setIsOpen(!isOpen)
            }
          }}
          className={cn(
            'w-full h-auto min-h-10 px-3 py-2 rounded-md border border-input bg-background',
            'text-sm ring-offset-background placeholder:text-muted-foreground',
            'flex flex-wrap items-center gap-2',
            'hover:bg-accent hover:text-accent-foreground cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            disabled && 'bg-muted cursor-not-allowed opacity-50',
            isOpen && 'ring-2 ring-ring ring-offset-2'
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
                  <span
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      removeTag(value[idx])
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        e.stopPropagation()
                        removeTag(value[idx])
                      }
                    }}
                    className="ml-1 inline-flex items-center rounded-full hover:bg-muted-foreground/20 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </span>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">{placeholder}</span>
          )}

          {/* Botão clear */}
          {!disabled && value.length > 0 && (
            <span
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                clearAll(e as React.MouseEvent)
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.stopPropagation()
                  clearAll(e as any)
                }
              }}
              className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-muted cursor-pointer"
            >
              <X className="h-4 w-4 opacity-50 hover:opacity-100" />
            </span>
          )}
        </div>

        {/* Dropdown de opções */}
        {isOpen && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-input rounded-md shadow-lg">
            {/* Input de busca */}
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar... (Use ↑ ↓ para navegar, Enter para selecionar)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                'w-full px-3 py-3 border-b border-input bg-background text-sm',
                'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500'
              )}
            />

            {/* Lista de opções */}
            <div ref={optionsRef} className="max-h-64 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, idx) => (
                  <div
                    key={option.value}
                    onClick={() => toggleOption(option.value)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 text-sm cursor-pointer transition-all duration-150',
                      'hover:bg-blue-50 dark:hover:bg-blue-900/30',
                      highlightedIndex === idx && 'bg-blue-100 dark:bg-blue-900 font-semibold',
                      value.includes(option.value) &&
                        'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium',
                      highlightedIndex === idx && value.includes(option.value) &&
                        'bg-blue-100 dark:bg-blue-900'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-4 h-4 rounded border',
                        value.includes(option.value) 
                          ? 'bg-blue-500 border-blue-500' 
                          : 'border-gray-300 dark:border-gray-600'
                      )} />
                      <span>{option.label}</span>
                    </div>
                  </div>
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
