"use client";

import { Avatar } from "@/components/base/avatar/avatar";
import { Chip } from "@/components/base/badges/chip";
import { Counter } from "@/components/base/badges/counter";
import { Button } from "@/components/base/buttons/button";
import { DrawerFooter, DrawerHeader } from "@/components/base/drawer/drawer";

/**
 * The gallery tile: the docs hero's contributor panel docked at the end edge
 * of the card over a dimmed page, drawn without the overlay (a live Drawer
 * would cover the index page). The panel is laid out at its real 320px width
 * and scaled to the card's height, like a full-height drawer on screen; its
 * surface classes mirror the dialog in components/base/modal/modal.tsx.
 */
export function DrawerPreviewCard() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div aria-hidden className="absolute inset-0 flex flex-col gap-3 p-5">
        <span className="h-3 w-24 rounded-full bg-background-tertiary-default" />
        <span className="h-2.5 w-36 rounded-full bg-background-tertiary-default" />
        <span className="mt-2 h-16 w-28 rounded-2xl bg-background-tertiary-default" />
        <span className="h-2.5 w-20 rounded-full bg-background-tertiary-default" />
      </div>
      <div aria-hidden className="absolute inset-0 bg-black/5 dark:bg-black/30" />
      <div className="absolute end-3 top-3 flex h-[346px] w-[320px] origin-top-right scale-50 flex-col gap-2 rounded-3xl border border-separator-border bg-background-full py-4 shadow-xs rtl:origin-top-left">
        <DrawerHeader title="Contributor" />
        <div className="flex flex-1 flex-col gap-3 px-4">
          <div className="relative -mx-2 mb-6">
            <div className="h-[72px] overflow-hidden rounded-2xl bg-background-tertiary-default">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/templates/ai-profile-cover.png" alt="" className="size-full object-cover object-[50%_45%]" />
            </div>
            <Avatar
              initials="M"
              color="neutral"
              className="absolute start-2 -bottom-6 size-12 text-title-3-medium ring-4 ring-background-full"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-headline-medium text-text-primary">Mertcan Esmergül</p>
            <div className="flex items-center gap-1.5">
              <span className="text-body-regular text-text-secondary">@sitenley</span>
              <Counter color="neutral">PRO</Counter>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-title-2-medium text-text-primary tabular-nums">$7,462</p>
            <Chip variant="bold" color="purple">+14.8%</Chip>
          </div>
        </div>
        <DrawerFooter className="flex-row justify-end">
          <Button variant="secondary">Message</Button>
          <Button>Open full profile</Button>
        </DrawerFooter>
      </div>
    </div>
  );
}
