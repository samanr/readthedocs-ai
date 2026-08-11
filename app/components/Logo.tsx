import Image from "next/image"

export function Logo() {
  return (
    <div
      className="flex h-32 w-32 items-center justify-center rounded-2xl"
      style={{ backgroundColor: "#5270ff" }}
    >
      <Image
        src="/readmydocs.png"
        alt="ReadMyDocs logo"
        width={88}
        height={88}
        className="object-contain"
        priority
      />
    </div>
  )
}
