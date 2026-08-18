import Image from "next/image"

export function Logo() {
  return (
    <div
      className="flex size-74 items-center justify-center rounded-2xl"
      style={{ backgroundColor: "#5270ff" }}
    >
      <Image
        src="/readmydocs.png"
        alt="ReadMyDocs logo"
        width={200}
        height={200}
        className="object-contain"
        priority
      />
    </div>
  )
}
