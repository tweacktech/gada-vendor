import { useMemo, type ReactNode } from 'react'

import {
  LogOutIcon
} from 'lucide-react'

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { auth } from '@/lib/auth'
import { disconnectEcho } from '@/lib/echo'

type Props = {
  trigger: ReactNode
  defaultOpen?: boolean
  align?: 'start' | 'center' | 'end'
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
}

const ProfileDropdown = ({ trigger, defaultOpen, align = 'end' }: Props) => {
  function handleLogout() {
    disconnectEcho()
    auth.logout()
    window.location.href = '/login'
  }

  const currentUser = useMemo(() => auth.getCurrentUser(), [])
    const userInitials = useMemo(
        () => (currentUser ? getInitials(currentUser.full_name) : ""),
        [currentUser]
    )
    const userName = currentUser?.full_name ?? "User"
    const userEmail = currentUser?.email ?? ""

  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent className='w-80' align={align || 'end'}>
        <DropdownMenuLabel className='flex items-center gap-4 px-4 py-2.5 font-normal'>
          <div className='relative'>
            <Avatar className='size-10'>
              <AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png' alt={userName} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <span className='ring-card absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2' />
          </div>
          <div className='flex flex-1 flex-col items-start'>
            <span className='text-foreground text-lg font-semibold'>{userName}</span>
            <span className='text-muted-foreground text-base'>{userEmail}</span>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant='destructive'
          className='px-4 py-2.5 text-base'
          onClick={handleLogout}
        >
          <LogOutIcon className='size-5' />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ProfileDropdown
