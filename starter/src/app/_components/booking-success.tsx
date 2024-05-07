"use client";

import { useGetBooking, useCancelBooking } from "@calcom/atoms";
import { CheckCircleIcon, CircleX, ExternalLinkIcon, Loader } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { BookingStatus } from "node_modules/@calcom/atoms/dist/packages/prisma/enums";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import {
  cn,
  composeReadableTimeRange,
  stripCalOAuthClientIdFromEmail,
  stripCalOAuthClientIdFromText,
} from "~/lib/utils";

export const BookingSuccess = () => {
  const params = useSearchParams();
  const bookingUid = params.get("bookingUid");
  const expertUsername = params.get("expert");
  const fromReschedule = params.get("fromReschedule");
  const { isLoading, data: booking, refetch } = useGetBooking(bookingUid ?? "");
  // TODO: We're doing this to cast the type since @calcom/atoms doesn't type them properly
  const bookingStatus = booking?.status as BookingStatus;
  const { mutate: cancelBooking } = useCancelBooking({
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    onSuccess: async () => {
      await refetch();
    },
  });
  //   [@calcom] The API returns the UID of the previous booking in case you'd like to show changed booking details in your UI.
  const bookingPrevious = useGetBooking(fromReschedule ?? "");
  if (!bookingUid) {
    return <div>No Booking UID.</div>;
  }

  if (isLoading) {
    return <Loader className="z-50 animate-spin place-self-center" />;
  }

  if (!booking) {
    return <div>Booking not found</div>;
  }

  const what = stripCalOAuthClientIdFromText(booking.title) ?? booking.title;
  const formerWhat = bookingPrevious?.data
    ? stripCalOAuthClientIdFromText(bookingPrevious?.data?.title)
    : null;

  const when = composeReadableTimeRange({
    startTime: booking.startTime,
    endTime: booking.endTime,
    timeZone: booking.user?.timeZone ?? "",
  });
  const formerWhen = bookingPrevious.data
    ? composeReadableTimeRange({
        startTime: bookingPrevious.data?.startTime,
        endTime: bookingPrevious.data?.endTime,
        timeZone: bookingPrevious.data?.user?.timeZone ?? "",
      })
    : null;

  const who = {
    host: `${booking?.user?.name} (Host) - ${stripCalOAuthClientIdFromEmail(booking?.user?.email ?? "")}`,
    attendees: booking.attendees.map(
      (attendee) => `${attendee.name ? `${stripCalOAuthClientIdFromText(attendee.name)} - ` : ""} 
${stripCalOAuthClientIdFromEmail(attendee.email)}`
    ),
  };
  const formerWho = bookingPrevious?.data
    ? {
        host: `${bookingPrevious.data?.user?.name} (Host) - ${stripCalOAuthClientIdFromEmail(bookingPrevious.data?.user?.email ?? "")}`,
        attendees: bookingPrevious.data.attendees.map(
          (
            previousAttendee
          ) => `${previousAttendee.name ? `${stripCalOAuthClientIdFromText(previousAttendee.name)} - ` : ""} 
${stripCalOAuthClientIdFromEmail(previousAttendee.email)}`
        ),
      }
    : null;

  const where = booking.location;
  const formerWhere = bookingPrevious?.data ? bookingPrevious?.data?.location : null;

  console.log({
    when: { when, formerWhen },
    what: { what, formerWhat },
    where: { where, formerWhere },
    who: { who, formerWho },
  });
  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="space-y-4 px-8">
        <div className="flex items-center justify-center space-x-2">
          {bookingStatus.toLowerCase() === "cancelled" && (
            <div className="flex flex-col items-center space-y-4">
              <CircleX className="h-8 w-8 text-destructive" />
              <CardTitle className="text-2xl">Meeting Cancelled</CardTitle>
            </div>
          )}
          {bookingStatus.toLowerCase() === "accepted" && (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
              <CardTitle className="text-2xl">Meeting scheduled successfully</CardTitle>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 px-8 pt-2 text-sm">
        <Separator className="mb-8" />
        <div className="grid gap-3">
          <ul className="grid gap-3">
            <li className="flex flex-col">
              <span className="font-semibold">What</span>
              {formerWhat !== what && (
                <span className={cn("text-muted-foreground line-through")}>{formerWhat}</span>
              )}
              <span
                className={cn(
                  "text-muted-foreground",
                  bookingStatus.toLowerCase() === "cancelled" && "line-through"
                )}>
                {what}
              </span>
            </li>
            <li className="flex flex-col">
              <span className="font-semibold">When</span>
              {formerWhen !== when && (
                <span className={cn("text-muted-foreground line-through")}>{formerWhen}</span>
              )}
              <span
                className={cn(
                  "text-muted-foreground",
                  bookingStatus.toLowerCase() === "cancelled" && "line-through"
                )}>
                {when}
              </span>
            </li>
            <li className="flex flex-col">
              <span className="font-semibold">Who</span>
              <ul>
                <li
                  className={cn(
                    "text-muted-foreground",
                    bookingStatus.toLowerCase() === "cancelled" && "line-through"
                  )}>
                  {who.host}
                </li>
                {who.attendees.map((attendee, idx) => (
                  <li
                    key={idx}
                    className={cn(
                      "text-muted-foreground",
                      bookingStatus.toLowerCase() === "cancelled" && "line-through",
                      // if the attendee is not in the previous booking, we'll highlight them
                      formerWho?.attendees?.findIndex((formerAttendee) => formerAttendee === attendee) ===
                        -1 && "font-semibold italic"
                    )}>
                    {formerWho?.attendees?.findIndex((formerAttendee) => formerAttendee === attendee) === -1
                      ? "New attendee: "
                      : ""}
                    {attendee}
                  </li>
                ))}
                {formerWho?.attendees?.map(
                  (formerAttendee, idx) =>
                    // if the attendee is in the current booking, we've already displayed them
                    who.attendees.findIndex((attendee) => attendee === formerAttendee) === -1 && (
                      <li
                        key={idx}
                        className={cn(
                          "text-muted-foreground",
                          // if the attendee is not in the current booking, we'll strike them out
                          who.attendees.findIndex((attendee) => attendee === formerAttendee) === -1 &&
                            "line-through"
                        )}>
                        {formerAttendee}
                      </li>
                    )
                )}
              </ul>
            </li>
            <li className="flex flex-col">
              <span className="font-semibold">Where</span>
              {/* Display the previous location only if it's different from the current booking */}
              {bookingPrevious.data?.location !== booking.location && (
                <span className={cn("text-muted-foreground")}>
                  {bookingPrevious.data?.location === "integrations:daily" ? (
                    <span className="border-b-0 border-transparent hover:border-b hover:border-current">
                      <Link
                        className={cn("inline-flex items-center gap-1")}
                        href={
                          (bookingPrevious.data?.metadata as { videoCallUrl?: string })?.videoCallUrl ?? "#"
                        }>
                        Online (Cal Video)
                        <ExternalLinkIcon className="size-4" />
                      </Link>
                    </span>
                  ) : (
                    bookingPrevious.data?.location
                  )}
                </span>
              )}
              {/* Display the location of the current booking */}
              <span
                className={cn(
                  "text-muted-foreground",
                  bookingStatus.toLowerCase() === "cancelled" && "line-through",
                  bookingPrevious.data?.location !== booking.location && "line-through"
                )}>
                {booking?.location === "integrations:daily" ? (
                  <span className="border-b-0 border-transparent hover:border-b hover:border-current">
                    <Link
                      className={cn(
                        "inline-flex items-center gap-1",
                        bookingStatus.toLowerCase() === "cancelled" && "cursor-not-allowed"
                      )}
                      href={
                        bookingStatus.toLowerCase() === "cancelled"
                          ? "#"
                          : (booking?.metadata as { videoCallUrl?: string })?.videoCallUrl ?? "#"
                      }>
                      Online (Cal Video)
                      <ExternalLinkIcon className="size-4" />
                    </Link>
                  </span>
                ) : (
                  booking.location
                )}
              </span>
            </li>
            {booking.description && (
              <li className="flex flex-col">
                <span className="font-semibold">Event Description</span>
                {booking.description !== bookingPrevious.data?.description && (
                  <span className={cn("text-muted-foreground line-through")}>
                    {bookingPrevious?.data?.description}
                  </span>
                )}
                <span
                  className={cn(
                    "text-muted-foreground",
                    bookingStatus.toLowerCase() === "cancelled" && "line-through"
                  )}>
                  {booking.description}
                </span>
              </li>
            )}
          </ul>
        </div>
        {bookingStatus.toLowerCase() !== "cancelled" && <Separator className="mt-8" />}
      </CardContent>
      {bookingStatus.toLowerCase() !== "cancelled" && (
        <CardFooter className="flex flex-col px-8">
          <div>
            <span>Need to make changes? </span>
            <span>
              <Link href={`/experts/${expertUsername}?rescheduleUid=${bookingUid}`} className="underline">
                Reschedule
              </Link>{" "}
              or{" "}
              <div
                className="cursor-pointer underline"
                onClick={() => {
                  return cancelBooking({
                    id: booking.id,
                    uid: booking.uid,
                    cancellationReason: "User request",
                    allRemainingBookings: true,
                  });
                }}>
                Cancel
              </div>
            </span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default BookingSuccess;
