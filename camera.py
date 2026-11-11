#!/usr/bin/env python3
"""Camera helper for dsh-presence: face detection + face-width distance estimate.

Reads frames from a normal (RGB) webcam, detects the largest face, estimates
its distance from the face width in pixels, and streams newline-delimited JSON
to stdout:

    {"type": "camera-info", "available": true, "device": "camera[0]", ...}
    {"type": "camera", "now": 1730000000123, "face": true, "distanceCm": 132.4,
     "facePx": 118, "fps": 8.0, "error": null}

Design notes:
- The IR camera used by Windows Hello is exposed only under the
  KSCATEGORY_SENSOR_CAMERA category; ordinary apps cannot open it. This helper
  therefore targets the normal colour camera. If the colour camera is absent
  or locked, it reports available=false and keeps retrying quietly.
- Distance is a coarse estimate: dist = faceWidthCm * f_px / faceWidthPx,
  where f_px is derived from an assumed horizontal field of view. It is meant
  to drive the same "far = away / near = back" thresholds as the IR sensor,
  not to be a measurement instrument.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time

# The host installs OpenCV and numpy into ./pydeps next to this file so the
# bundle does not depend on the machine's global site-packages.
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "pydeps"))

import cv2


def emit(obj: dict) -> None:
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def now_ms() -> int:
    return int(time.time() * 1000)


def make_cascade():
    path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    cascade = cv2.CascadeClassifier(path)
    if cascade.empty():
        return None
    return cascade


def open_camera(index: int, width: int, height: int, backend_pref: str):
    backends = [cv2.CAP_MSMF, cv2.CAP_DSHOW] if backend_pref != "dshow" else [cv2.CAP_DSHOW, cv2.CAP_MSMF]
    for backend in backends:
        cap = cv2.VideoCapture(index, backend)
        if not cap.isOpened():
            cap.release()
            continue
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        cap.set(cv2.CAP_PROP_FPS, 15)
        ok, frame = cap.read()
        if ok and frame is not None:
            return cap, frame
        cap.release()
    return None, None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--interval-ms", type=int, default=250)
    ap.add_argument("--face-width-cm", type=float, default=14.0)
    ap.add_argument("--fov-deg", type=float, default=60.0)
    ap.add_argument("--width", type=int, default=640)
    ap.add_argument("--height", type=int, default=480)
    ap.add_argument("--device", type=str, default="")
    ap.add_argument("--backend", type=str, default="msmf")
    args = ap.parse_args()

    cascade = make_cascade()
    if cascade is None:
        emit({"type": "camera-info", "available": False, "device": None,
              "error": "opencv-face-cascade-missing"})
        return 2

    candidates = []
    if args.device:
        try:
            candidates = [int(args.device)]
        except ValueError:
            candidates = [0]
    else:
        candidates = list(range(6))

    cap = None
    frame = None
    chosen = None
    last_error = None
    for index in candidates:
        cap, frame = open_camera(index, args.width, args.height, args.backend)
        if cap is not None:
            chosen = index
            break
        last_error = "camera-%d-unavailable" % index

    if cap is None:
        emit({"type": "camera-info", "available": False, "device": None,
              "error": last_error or "no-camera"})
        # Keep the process alive but idle; the host only restarts on exit.
        while True:
            time.sleep(30)
            cap, frame = open_camera(0, args.width, args.height, args.backend)
            if cap is not None:
                chosen = 0
                emit({"type": "camera-info", "available": True, "device": "camera[0]",
                      "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
                      "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))})
                break

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or args.width
    emit({"type": "camera-info", "available": True, "device": "camera[%d]" % chosen,
          "width": width, "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or args.height})

    f_px = 0.5 * width / math.tan(math.radians(args.fov_deg) / 2.0)
    smoothed = None
    last_detect = 0.0
    fails = 0
    interval = max(0.05, args.interval_ms / 1000.0)

    while True:
        ok, frame_now = cap.read()
        if not ok or frame_now is None:
            fails += 1
            if fails % 20 == 0:
                cap.release()
                cap, _ = open_camera(chosen or 0, args.width, args.height, args.backend)
                if cap is None:
                    emit({"type": "camera-info", "available": False, "device": None,
                          "error": "camera-lost"})
                    time.sleep(2)
            time.sleep(0.15)
            continue
        fails = 0

        wait = interval - (time.time() - last_detect)
        if wait > 0:
            time.sleep(wait)

        last_detect = time.time()
        gray = cv2.cvtColor(frame_now, cv2.COLOR_BGR2GRAY)
        # A shutter or an obstacle in front of the lens produces a frame with no
        # edges (a smooth gradient at best). Laplacian variance is a cheap
        # "is there any scene detail" measure: a real room is far above ~25.
        scene_edge = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5,
                                         minSize=(48, 48))
        face_px = 0
        if len(faces) > 0:
            face_px = max(int(w) for (_, _, w, _) in faces)

        distance = None
        if face_px > 0:
            raw = args.face_width_cm * f_px / face_px
            smoothed = raw if smoothed is None else smoothed * 0.6 + raw * 0.4
            distance = round(smoothed, 1)

        emit({"type": "camera", "now": now_ms(), "face": face_px > 0,
              "distanceCm": distance, "facePx": face_px,
              "sceneEdge": round(scene_edge, 1), "error": None})

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(0)
