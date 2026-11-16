import type { MaintenanceRequestImage } from '@/types/maintenanceRequestTypes'

/**
 * Ảnh sự cố ở T10 và L11. Ảnh riêng tư là URL có chữ ký hết hạn sau 1 giờ (FR-138); bấm mở ảnh gốc ở
 * tab mới, quá hạn thì tải lại trang.
 */
export default function MaintenanceRequestImages({ images }: { images: MaintenanceRequestImage[] }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm md:p-6">
      <h2 className="text-lg font-medium">Ảnh sự cố</h2>
      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">Không có ảnh.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {images.map((image, index) => (
            <li key={image.url} className="aspect-square overflow-hidden rounded-lg border bg-muted">
              <a
                href={image.url}
                target="_blank"
                rel="noreferrer"
                className="block size-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <img src={image.url} alt={`Ảnh sự cố, ảnh ${index + 1}`} loading="lazy" className="size-full object-cover" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
