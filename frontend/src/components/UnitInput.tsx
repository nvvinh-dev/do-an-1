import { useId, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group'

interface UnitInputProps extends ComponentProps<'input'> {
  /** Đơn vị ghi trong ô, bên phải: "đ", "m²", "kWh", "m³", "đ/tháng". Không có thì là ô `Input` thường. */
  unit?: string
}

/**
 * Ô nhập số có đơn vị nằm trong ô (docs/design-system.md mục 8). Đơn vị gắn vào ô qua `aria-describedby`
 * để trình đọc màn hình đọc cùng nhãn; nhãn của ô vì thế chỉ cần tên đại lượng ("Diện tích"), không lặp
 * đơn vị. Giữ nguyên mọi thuộc tính của `<input>` (`id`, `value`, `inputMode`, `aria-invalid`...).
 */
export default function UnitInput({ unit, className, 'aria-describedby': describedBy, ...props }: UnitInputProps) {
  const unitId = useId()

  if (!unit) {
    return <Input {...props} className={className} aria-describedby={describedBy} />
  }

  return (
    <InputGroup>
      <InputGroupInput
        {...props}
        className={className}
        aria-describedby={[describedBy, unitId].filter(Boolean).join(' ')}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupText id={unitId}>{unit}</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  )
}
