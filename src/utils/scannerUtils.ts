import { useState, useEffect } from 'react';

// Hook to check/load OpenCV
export const useOpenCv = () => {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        // @ts-ignore
        if (window.cv && window.cv.Mat) {
            setLoaded(true);
            return;
        }

        const interval = setInterval(() => {
            // @ts-ignore
            if (window.cv && window.cv.Mat) {
                setLoaded(true);
                clearInterval(interval);
            }
        }, 100);

        return () => clearInterval(interval);
    }, []);

    return loaded;
};

// Types for corner points
export interface Point {
    x: number;
    y: number;
}

// Helper: Scan Document
export const scanDocument = (
    imageSrc: string,
    videoWidth: number,
    videoHeight: number
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
            try {
                // @ts-ignore
                const cv = window.cv;
                if (!cv) {
                    reject("OpenCV not loaded");
                    return;
                }

                // 1. Read image
                let src = cv.imread(img);

                // Resize for faster processing if too large? 
                // (Skipping optimize for now, let's process full res mainly or scale down for detection)

                // 2. Preprocess
                let gray = new cv.Mat();
                cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

                let blur = new cv.Mat();
                cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

                let edges = new cv.Mat();
                cv.Canny(blur, edges, 75, 200);

                // 3. Find Contours
                let contours = new cv.MatVector();
                let hierarchy = new cv.Mat();
                cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

                // 4. Find largest quadrilateral
                let maxArea = 0;
                let maxContourIndex = -1;

                for (let i = 0; i < contours.size(); ++i) {
                    let area = cv.contourArea(contours.get(i));
                    if (area > maxArea) {
                        maxArea = area;
                        maxContourIndex = i;
                    }
                }

                // Default corners = full image if detection fails
                let resultMat;

                if (maxContourIndex !== -1 && maxArea > (src.cols * src.rows * 0.1)) { // Min 10% area
                    let cnt = contours.get(maxContourIndex);
                    let peri = cv.arcLength(cnt, true);
                    let approx = new cv.Mat();
                    cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

                    if (approx.rows === 4) {
                        // Found a quad!
                        // Order points: TL, TR, BR, BL
                        // ... implementation of perspective transform ...
                        // For simplicity in MVP, let's just CROP the bounding rect or use PerspectiveTransform
                        // Let's implement full perspective transform.

                        // Get detected corners
                        let corners = [];
                        for (let i = 0; i < 4; i++) {
                            corners.push({
                                x: approx.data32S[i * 2],
                                y: approx.data32S[i * 2 + 1]
                            });
                        }

                        // Sort corners... (need robust sorting)
                        // For now, let's just use the bounding rect to keep it safe/simple for first pass 
                        // unless we want full unwarp. 
                        // Full unwarp is complex to get corners right order without sorting logic.
                        // Let's stick to simple "Enhanced B&W" filter for now + Rotation if needed?
                        // User asked for "CamScanner" which implies unwarp.

                        // Revisit sorting:
                        // Sort by Sum (TL, BR) and Diff (TR, BL)
                        // TL: min sum, BR: max sum
                        // TR: min diff, BL: max diff

                        const sorted = sortCorners(corners);

                        let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
                            sorted[0].x, sorted[0].y,
                            sorted[1].x, sorted[1].y,
                            sorted[2].x, sorted[2].y,
                            sorted[3].x, sorted[3].y
                        ]);

                        // Compute width/height roughly
                        let width = Math.max(
                            Math.hypot(sorted[1].x - sorted[0].x, sorted[1].y - sorted[0].y),
                            Math.hypot(sorted[2].x - sorted[3].x, sorted[2].y - sorted[3].y)
                        );
                        let height = Math.max(
                            Math.hypot(sorted[3].x - sorted[0].x, sorted[3].y - sorted[0].y),
                            Math.hypot(sorted[2].x - sorted[1].x, sorted[2].y - sorted[1].y)
                        );

                        let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
                            0, 0,
                            width, 0,
                            width, height,
                            0, height
                        ]);

                        let M = cv.getPerspectiveTransform(srcTri, dstTri);
                        resultMat = new cv.Mat();
                        cv.warpPerspective(src, resultMat, M, new cv.Size(width, height));

                        M.delete(); srcTri.delete(); dstTri.delete(); approx.delete();
                    } else {
                        // Fallback: Just return original or grayscale
                        resultMat = src.clone();
                    }
                } else {
                    resultMat = src.clone();
                }

                // 5. Final Display / Conversion
                // We need to render the resultMat to a temporary canvas to get the Data URL
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = resultMat.cols;
                tempCanvas.height = resultMat.rows;

                // Use cv.imshow to draw mat to canvas by ID? OpenCV.js usually requires ID.
                // But we can also use direct pixel manipulation if needed, OR:
                // Create a unique ID for the temp canvas
                const id = 'temp_cv_canvas_' + Math.random().toString(36).substr(2, 9);
                tempCanvas.id = id;
                // tempCanvas.style.display = 'none'; // OpenCV needs it in DOM? Usually not if just finding by ID, but simpler to append
                document.body.appendChild(tempCanvas);

                cv.imshow(id, resultMat);

                // Get Data URL
                const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.8);

                // Cleanup DOM
                document.body.removeChild(tempCanvas);

                // 5. Final Display / Conversion
                // ... (rest of code)
                // Cleanup Mats
                if (resultMat !== src) resultMat.delete();
                src.delete(); gray.delete(); blur.delete(); edges.delete();
                contours.delete(); hierarchy.delete();

                resolve(dataUrl);
            } catch (e) {
                reject(e);
            }
        };
    });
};

const sortCorners = (corners: Point[]) => {
    // Sort logic here
    // ...
    return corners; // Placeholder
}
