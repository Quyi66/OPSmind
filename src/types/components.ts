/**
 * 组件相关类型定义
 */

import type { VNode } from 'vue'

// 基础组件属性
export interface BaseComponentProps {
  id?: string
  class?: string | string[] | Record<string, boolean>
  style?: string | Record<string, any>
  disabled?: boolean
  loading?: boolean
}

// 按钮组件
export namespace ButtonComponent {
  export type Type = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'text'
  export type Size = 'large' | 'default' | 'small' | 'mini'
  export type NativeType = 'button' | 'submit' | 'reset'

  export interface Props extends BaseComponentProps {
    type?: Type
    size?: Size
    nativeType?: NativeType
    plain?: boolean
    round?: boolean
    circle?: boolean
    icon?: string
    autofocus?: boolean
  }

  export interface Events {
    click: (event: MouseEvent) => void
  }
}

// 输入框组件
export namespace InputComponent {
  export type Type = 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search'
  export type Size = 'large' | 'default' | 'small' | 'mini'

  export interface Props extends BaseComponentProps {
    modelValue?: string | number
    type?: Type
    size?: Size
    placeholder?: string
    clearable?: boolean
    showPassword?: boolean
    readonly?: boolean
    maxlength?: number
    minlength?: number
    max?: number
    min?: number
    step?: number
    resize?: 'none' | 'both' | 'horizontal' | 'vertical'
    autosize?: boolean | { minRows?: number; maxRows?: number }
    autocomplete?: string
    name?: string
    form?: string
    label?: string
    tabindex?: string | number
    validateEvent?: boolean
    inputStyle?: Record<string, any>
  }

  export interface Events {
    'update:modelValue': (value: string | number) => void
    input: (value: string | number) => void
    change: (value: string | number) => void
    focus: (event: FocusEvent) => void
    blur: (event: FocusEvent) => void
    clear: () => void
  }
}

// 选择器组件
export namespace SelectComponent {
  export type Size = 'large' | 'default' | 'small' | 'mini'

  export interface Option {
    label: string
    value: any
    disabled?: boolean
    children?: Option[]
  }

  export interface Props extends BaseComponentProps {
    modelValue?: any
    multiple?: boolean
    size?: Size
    clearable?: boolean
    collapseTags?: boolean
    multipleLimit?: number
    name?: string
    autocomplete?: string
    placeholder?: string
    filterable?: boolean
    allowCreate?: boolean
    filterMethod?: (query: string) => void
    remote?: boolean
    remoteMethod?: (query: string) => void
    noMatchText?: string
    noDataText?: string
    popperClass?: string
    reserveKeyword?: boolean
    defaultFirstOption?: boolean
    popperAppendToBody?: boolean
    automaticDropdown?: boolean
  }

  export interface Events {
    'update:modelValue': (value: any) => void
    change: (value: any) => void
    visibleChange: (visible: boolean) => void
    removeTag: (tag: any) => void
    clear: () => void
    blur: (event: FocusEvent) => void
    focus: (event: FocusEvent) => void
  }
}

// 表格组件
export namespace TableComponent {
  export interface Column {
    prop?: string
    label: string
    width?: string | number
    minWidth?: string | number
    fixed?: boolean | 'left' | 'right'
    renderHeader?: (h: any, { column, $index }: any) => VNode
    sortable?: boolean | 'custom'
    sortMethod?: (a: any, b: any) => number
    sortBy?: string | string[] | ((row: any, index: number) => string)
    sortOrders?: ('ascending' | 'descending' | null)[]
    resizable?: boolean
    formatter?: (row: any, column: any, cellValue: any, index: number) => any
    showOverflowTooltip?: boolean
    align?: 'left' | 'center' | 'right'
    headerAlign?: 'left' | 'center' | 'right'
    className?: string
    labelClassName?: string
    selectable?: (row: any, index: number) => boolean
    reserveSelection?: boolean
    filters?: Array<{ text: string; value: any }>
    filterPlacement?: string
    filterMultiple?: boolean
    filterMethod?: (value: any, row: any, column: any) => boolean
    filteredValue?: any[]
  }

  export interface Props extends BaseComponentProps {
    data: any[]
    height?: string | number
    maxHeight?: string | number
    stripe?: boolean
    border?: boolean
    size?: 'medium' | 'small' | 'mini'
    fit?: boolean
    showHeader?: boolean
    highlightCurrentRow?: boolean
    currentRowKey?: string | number
    rowClassName?: string | ((row: any, index: number) => string)
    rowStyle?: Record<string, any> | ((row: any, index: number) => Record<string, any>)
    cellClassName?: string | ((row: any, column: any, rowIndex: number, columnIndex: number) => string)
    cellStyle?: Record<string, any> | ((row: any, column: any, rowIndex: number, columnIndex: number) => Record<string, any>)
    headerRowClassName?: string | ((row: any, index: number) => string)
    headerRowStyle?: Record<string, any> | ((row: any, index: number) => Record<string, any>)
    headerCellClassName?: string | ((row: any, column: any, rowIndex: number, columnIndex: number) => string)
    headerCellStyle?: Record<string, any> | ((row: any, column: any, rowIndex: number, columnIndex: number) => Record<string, any>)
    rowKey?: string | ((row: any) => string)
    emptyText?: string
    defaultExpandAll?: boolean
    expandRowKeys?: any[]
    defaultSort?: { prop: string; order: 'ascending' | 'descending' }
    tooltipEffect?: 'dark' | 'light'
    showSummary?: boolean
    sumText?: string
    summaryMethod?: (param: { columns: any[]; data: any[] }) => any[]
    spanMethod?: (param: { row: any; column: any; rowIndex: number; columnIndex: number }) => number[] | { rowspan: number; colspan: number }
    selectOnIndeterminate?: boolean
    indent?: number
    lazy?: boolean
    load?: (row: any, treeNode: any, resolve: (data: any[]) => void) => void
    treeProps?: { hasChildren?: string; children?: string }
  }

  export interface Events {
    select: (selection: any[], row: any) => void
    selectAll: (selection: any[]) => void
    selectionChange: (selection: any[]) => void
    cellMouseEnter: (row: any, column: any, cell: HTMLElement, event: Event) => void
    cellMouseLeave: (row: any, column: any, cell: HTMLElement, event: Event) => void
    cellClick: (row: any, column: any, cell: HTMLElement, event: Event) => void
    cellDblclick: (row: any, column: any, cell: HTMLElement, event: Event) => void
    rowClick: (row: any, column: any, event: Event) => void
    rowContextmenu: (row: any, column: any, event: Event) => void
    rowDblclick: (row: any, column: any, event: Event) => void
    headerClick: (column: any, event: Event) => void
    headerContextmenu: (column: any, event: Event) => void
    sortChange: (param: { column: any; prop: string; order: string }) => void
    filterChange: (filters: Record<string, any[]>) => void
    currentChange: (currentRow: any, oldCurrentRow: any) => void
    headerDragend: (newWidth: number, oldWidth: number, column: any, event: Event) => void
    expandChange: (row: any, expandedRows: any[]) => void
  }
}

// 对话框组件
export namespace DialogComponent {
  export interface Props extends BaseComponentProps {
    modelValue: boolean
    title?: string
    width?: string | number
    fullscreen?: boolean
    top?: string
    modal?: boolean
    modalAppendToBody?: boolean
    appendToBody?: boolean
    lockScroll?: boolean
    customClass?: string
    closeOnClickModal?: boolean
    closeOnPressEscape?: boolean
    showClose?: boolean
    beforeClose?: (done: () => void) => void
    center?: boolean
    destroyOnClose?: boolean
  }

  export interface Events {
    'update:modelValue': (value: boolean) => void
    open: () => void
    opened: () => void
    close: () => void
    closed: () => void
  }
}

// 表单组件
export namespace FormComponent {
  export type LabelPosition = 'left' | 'right' | 'top'
  export type Size = 'medium' | 'small' | 'mini'

  export interface Props extends BaseComponentProps {
    model: Record<string, any>
    rules?: Record<string, any>
    labelPosition?: LabelPosition
    labelWidth?: string | number
    labelSuffix?: string
    inline?: boolean
    inlineMessage?: boolean
    statusIcon?: boolean
    showMessage?: boolean
    size?: Size
    disabled?: boolean
    validateOnRuleChange?: boolean
    hideRequiredAsterisk?: boolean
    scrollToError?: boolean
  }

  export interface Events {
    validate: (prop: string, valid: boolean, message: string) => void
  }
}

// 类型已在上面定义时导出
