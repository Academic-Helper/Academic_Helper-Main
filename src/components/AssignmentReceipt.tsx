
"use client";

import React, { forwardRef } from 'react';
import type { Assignment, UserData } from '@/types';
import { format } from 'date-fns';

interface AssignmentReceiptProps {
  assignment: Assignment;
  seeker: UserData;
  writer: UserData;
}

export const AssignmentReceipt = forwardRef<HTMLDivElement, AssignmentReceiptProps>(
  ({ assignment, seeker, writer }, ref) => {
    return (
      <div
        ref={ref}
        className="w-[210mm] min-h-[297mm] p-8 bg-white text-black font-sans text-xs"
      >
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Academic Helper</h1>
            <p className="text-gray-500">Your Academic Success Partner</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-semibold text-gray-700">Receipt</h2>
            <p className="text-gray-500"><strong>Receipt #:</strong> {assignment.id.substring(0, 8).toUpperCase()}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            <div className="border p-2 rounded-md">
                <p className="font-semibold text-gray-600 text-xs">Posted Date</p>
                <p>{assignment.createdAt ? format(assignment.createdAt.toDate(), 'PPP') : 'N/A'}</p>
            </div>
            <div className="border p-2 rounded-md">
                <p className="font-semibold text-gray-600 text-xs">Claimed Date</p>
                <p>{assignment.updatedAt ? format(assignment.updatedAt.toDate(), 'PPP') : 'N/A'}</p>
            </div>
            <div className="border p-2 rounded-md">
                <p className="font-semibold text-gray-600 text-xs">Completed Date</p>
                 <p>{format(new Date(), 'PPP')}</p>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-gray-600 border-b pb-1 mb-2">BILLED TO</h3>
            <p className="font-bold">{seeker.name}</p>
            <p>{seeker.email}</p>
            <p>User ID: {seeker.ahUserId}</p>
          </div>
          <div className="text-right">
            <h3 className="font-semibold text-gray-600 border-b pb-1 mb-2">SERVICE FROM</h3>
            <p className="font-bold">{writer.name}</p>
          </div>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 font-semibold">Description</th>
              <th className="p-2 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="p-2">
                <p className="font-medium">Academic Writing Service</p>
                <p className="text-gray-500 text-xs">Assignment: "{assignment.title}"</p>
              </td>
              <td className="p-2 text-right">LKR {assignment.fee?.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end mt-4">
          <div className="w-1/3">
            <div className="flex justify-between">
              <span className="font-semibold">Subtotal:</span>
              <span>LKR {assignment.fee?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mt-1 pt-1 border-t">
              <span className="font-bold text-base">Total Paid:</span>
              <span className="font-bold text-base">LKR {assignment.fee?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-gray-500">
          <p className="font-bold">Thank you for using Academic Helper!</p>
          <p>This receipt confirms that the payment for the above service has been successfully processed.</p>
        </div>
      </div>
    );
  }
);

AssignmentReceipt.displayName = 'AssignmentReceipt';
