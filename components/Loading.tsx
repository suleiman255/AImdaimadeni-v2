"use client";

import React from "react";
import Lottie from "lottie-react";
import loadingAnimation from "../public/animations/loading.json";

export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
      <Lottie
        animationData={loadingAnimation}
        loop
        style={{ width: 150, height: 150 }}
      />
    </div>
  );
}
