import * as Tabs from "@radix-ui/react-tabs"

export function ProfileTabs({ children }: { children: React.ReactNode }) {
  return (
    <Tabs.Root defaultValue="profile" className="w-full">
      <Tabs.List className="flex border-b mb-4 space-x-4">
        <Tabs.Trigger
          value="profile"
          className="px-4 py-2 font-medium text-sm data-[state=active]:border-b-2 border-category"
        >
          Perfil
        </Tabs.Trigger>
        {children}
      </Tabs.List>
    </Tabs.Root>
  )
}
