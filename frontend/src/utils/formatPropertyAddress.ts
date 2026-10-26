interface PropertyAddressParts {
  address: string
  ward: string
  city: string
}

/** Địa chỉ đầy đủ của khu trọ: số nhà, đường → phường/xã → tỉnh/thành, cách nhau bằng dấu phẩy. */
export function formatPropertyAddress({ address, ward, city }: PropertyAddressParts): string {
  return [address, ward, city]
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .join(', ')
}
