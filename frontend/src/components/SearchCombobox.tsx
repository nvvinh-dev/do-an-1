import { useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'

interface SearchComboboxProps<Item> {
  id: string
  /** Toàn bộ danh sách, theo thứ tự hiện khi chưa gõ gì. */
  items: readonly Item[]
  /**
   * Các mục khớp chữ đang gõ, mục khớp nhất đứng đầu: ô tô sẵn mục đầu tiên nên nhấn Enter là chọn
   * mục này. Chữ rỗng thì trả đủ `items`. Truyền hàm giữ nguyên giữa các lần vẽ (hàm của `utils/`
   * hoặc bọc `useCallback`) để không phải tìm lại khi chữ trong ô không đổi.
   */
  search: (query: string) => readonly Item[]
  selectedItem: Item | null
  onSelect: (item: Item | null) => void
  onBlur: () => void
  inputRef: Ref<HTMLInputElement>
  /** Chữ hiện trong ô khi đã chọn; mặc định là chính mục (danh sách chuỗi). */
  itemToLabel?: (item: Item) => string
  /** Khóa duy nhất của mục, để so mục với giá trị đang chọn; mặc định là chính mục. */
  itemToKey?: (item: Item) => string
  /** Nội dung một dòng trong danh sách; mặc định là `itemToLabel`. */
  renderItem?: (item: Item) => ReactNode
  placeholder: string
  emptyText: string
  disabled?: boolean
  invalid: boolean
}

/**
 * Ô chọn một mục trong danh sách dài có ô tìm (`combobox`, docs/design-system.md mục 6.1, 6.2):
 * ngân hàng ở L4, phường/xã ở L2. Chữ trong ô chỉ để lọc; giá trị của form là mục đã chọn trong
 * danh sách. Đóng danh sách mà không chọn mục mới (Tab, bấm ra ngoài, Esc) thì ô trở lại chữ của
 * mục đang chọn, hoặc để trống nếu chưa chọn: chữ trong ô luôn khớp giá trị sẽ được lưu.
 */
export default function SearchCombobox<Item>({
  id,
  items,
  search,
  selectedItem,
  onSelect,
  onBlur,
  inputRef,
  itemToLabel = String,
  itemToKey = String,
  renderItem = itemToLabel,
  placeholder,
  emptyText,
  disabled = false,
  invalid,
}: SearchComboboxProps<Item>) {
  const [open, setOpen] = useState(false)
  // `null` là không gõ gì: ô hiện chữ của mục đang chọn và danh sách hiện đủ.
  const [query, setQuery] = useState<string | null>(null)
  const filteredItems = useMemo(() => search(query ?? ''), [search, query])
  const popupRef = useRef<HTMLDivElement>(null)

  const close = () => {
    setOpen(false)
    setQuery(null)
  }

  return (
    <Combobox
      items={items}
      filteredItems={filteredItems}
      value={selectedItem}
      onValueChange={(item: Item | null) => onSelect(item)}
      inputValue={query ?? (selectedItem === null ? '' : itemToLabel(selectedItem))}
      onInputValueChange={setQuery}
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : close())}
      itemToStringLabel={itemToLabel}
      itemToStringValue={itemToKey}
      isItemEqualToValue={(item: Item, value: Item) => itemToKey(item) === itemToKey(value)}
      disabled={disabled}
      autoHighlight
    >
      <ComboboxInput
        id={id}
        ref={inputRef}
        className="w-full"
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid}
        onBlur={(event) => {
          // Base UI 1.9 có lúc không đóng danh sách khi Tab sang ô khác (sau vài lần chọn liên tiếp),
          // để lại chữ vừa gõ khác mục đang chọn. Tự đóng, trừ khi tiêu điểm đi vào chính danh sách.
          if (!(event.relatedTarget instanceof Node && popupRef.current?.contains(event.relatedTarget))) {
            close()
          }
          onBlur()
        }}
      />
      <ComboboxContent ref={popupRef}>
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: Item) => (
            <ComboboxItem key={itemToKey(item)} value={item}>
              {renderItem(item)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
