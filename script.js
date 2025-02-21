let cropData = { x: 50, y: 50, width: 100, height: 100 };
let aspectRatio = "1:1"; // デフォルトを 1:1 に変更
let dragging = false;
let resizing = false;
let resizingCorner = null;
let startX, startY;
let croppedImages = [];

// **アスペクト比選択**
document.getElementById("aspectRatio").value = "1:1"; // 初期値を1:1に設定
document.getElementById("aspectRatio").addEventListener("change", function () {
    aspectRatio = this.value;
});

// **メイン画像をロード**
document.getElementById("mainImageInput").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        let newImage = new Image();
        newImage.onload = function () {
            imageObj = newImage;
            document.getElementById("openCropWindow").style.display = "inline";
        };
        newImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

// **モーダルでトリミングを設定**
document.getElementById("openCropWindow").addEventListener("click", function () {
    const modal = document.getElementById("cropModal");
    modal.style.display = "flex";

    if (!imageObj || !imageObj.src) {
        alert("画像が正しく読み込まれていません。再度アップロードしてください。");
        return;
    }

    const cropCanvas = document.getElementById("cropCanvas");
    const ctx = cropCanvas.getContext("2d");

    cropCanvas.width = imageObj.naturalWidth;
    cropCanvas.height = imageObj.naturalHeight;
    ctx.drawImage(imageObj, 0, 0);

    // **中央に 1:1 のトリミングボックスを初期配置**
    let boxSize = Math.min(cropCanvas.width, cropCanvas.height) * 0.5;
    cropData.width = boxSize;
    cropData.height = boxSize;
    cropData.x = Math.floor((cropCanvas.width - boxSize) / 2);
    cropData.y = Math.floor((cropCanvas.height - boxSize) / 2);

    drawCropBox(ctx);

    function getCanvasCoordinates(event) {
        const rect = cropCanvas.getBoundingClientRect();
        const scaleX = cropCanvas.width / rect.width;
        const scaleY = cropCanvas.height / rect.height;

        return {
            x: ((event.clientX || event.touches[0].clientX) - rect.left) * scaleX,
            y: ((event.clientY || event.touches[0].clientY) - rect.top) * scaleY
        };
    }

    function drawCropBox(ctx) {
        ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
        
        // **画像を再描画**
        ctx.drawImage(imageObj, 0, 0);

        // **暗いオーバーレイを描画**
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);

        // **トリミングエリアだけ透明にする（クリア）**
        ctx.clearRect(cropData.x, cropData.y, cropData.width, cropData.height);

        // **画像をトリミング部分にだけもう一度描画**
        ctx.drawImage(
            imageObj,
            cropData.x, cropData.y, cropData.width, cropData.height, // 元画像からの切り取り位置
            cropData.x, cropData.y, cropData.width, cropData.height  // キャンバス上の描画位置
        );

        // **トリミングボックスの枠**
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]); // 破線
        ctx.strokeRect(cropData.x, cropData.y, cropData.width, cropData.height);

        // **角の「┓」デザイン**
        ctx.strokeStyle = "white";
        ctx.lineWidth = 10;
        ctx.setLineDash([]);

        const cornerSize = 30; // L字のサイズ

        const corners = [
            { x: cropData.x, y: cropData.y }, // 左上
            { x: cropData.x + cropData.width, y: cropData.y }, // 右上
            { x: cropData.x, y: cropData.y + cropData.height }, // 左下
            { x: cropData.x + cropData.width, y: cropData.y + cropData.height } // 右下
        ];

        corners.forEach(corner => {
            ctx.beginPath();
            ctx.moveTo(corner.x, corner.y);
            ctx.lineTo(corner.x + (corner.x === cropData.x ? cornerSize : -cornerSize), corner.y);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(corner.x, corner.y);
            ctx.lineTo(corner.x, corner.y + (corner.y === cropData.y ? cornerSize : -cornerSize));
            ctx.stroke();
        });

    }

    function drawHandles(ctx) {
        const handleSize = 20; // ハンドルサイズを拡大
        ctx.fillStyle = "blue";
        ["topLeft", "topRight", "bottomLeft", "bottomRight"].forEach((corner) => {
            const { x, y } = getHandlePosition(corner);
            ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
        });
    }

    function getHandlePosition(corner) {
        return {
            topLeft: { x: cropData.x, y: cropData.y },
            topRight: { x: cropData.x + cropData.width, y: cropData.y },
            bottomLeft: { x: cropData.x, y: cropData.y + cropData.height },
            bottomRight: { x: cropData.x + cropData.width, y: cropData.y + cropData.height },
        }[corner];
    }

    function getResizingCorner(x, y) {
        const handleSize = 20; // ハンドル判定を大きめに調整
        for (const corner of ["topLeft", "topRight", "bottomLeft", "bottomRight"]) {
            const { x: hx, y: hy } = getHandlePosition(corner);
            if (Math.abs(x - hx) < handleSize && Math.abs(y - hy) < handleSize) {
                return corner;
            }
        }
        return null;
    }

    function startDragging(event) {
        event.preventDefault();
        const pos = getCanvasCoordinates(event);
        startX = pos.x;
        startY = pos.y;

        // 角のハンドルが押されたかチェック
        resizingCorner = getResizingCorner(startX, startY);
        if (resizingCorner) {
            resizing = true;
            return;
        }

        if (
            startX > cropData.x &&
            startX < cropData.x + cropData.width &&
            startY > cropData.y &&
            startY < cropData.y + cropData.height
        ) {
            dragging = true;
        }
    }

    function moveCropBox(event) {
        if (!dragging && !resizing) return;
        event.preventDefault();
    
        const pos = getCanvasCoordinates(event);
        let moveX = pos.x;
        let moveY = pos.y;
    
        if (dragging) {
            // **ドラッグ時の処理**
            cropData.x = Math.max(0, Math.min(moveX - cropData.width / 2, cropCanvas.width - cropData.width));
            cropData.y = Math.max(0, Math.min(moveY - cropData.height / 2, cropCanvas.height - cropData.height));
        } else if (resizing) {
            let aspect = aspectRatio === "1:1" ? 1 : aspectRatio === "4:3" ? 4 / 3 : aspectRatio === "3:4" ? 3 / 4 : null;
    
            let newWidth = cropData.width;
            let newHeight = cropData.height;
    
            if (resizingCorner === "bottomRight") {
                // **右下のリサイズ**
                newWidth = moveX - cropData.x;
                newHeight = aspect ? newWidth / aspect : moveY - cropData.y;
            } else if (resizingCorner === "topLeft") {
                // **左上のリサイズ（右下固定）**
                let fixedRight = cropData.x + cropData.width;
                let fixedBottom = cropData.y + cropData.height;
                
                // **新しい幅・高さを計算**
                newWidth = fixedRight - moveX;
                newHeight = aspect ? newWidth / aspect : fixedBottom - moveY;
            
                // **右下の座標を固定**
                cropData.x = fixedRight - newWidth;
                cropData.y = fixedBottom - newHeight;
            
            } else if (resizingCorner === "topRight") {
                // **右上のリサイズ（左下固定）**
                let fixedLeft = cropData.x;
                let fixedBottom = cropData.y + cropData.height;
                newWidth = moveX - fixedLeft;
                newHeight = aspect ? newWidth / aspect : fixedBottom - cropData.y;
    
                // **左下のYを固定**
                cropData.y = fixedBottom - newHeight;
            } else if (resizingCorner === "bottomLeft") {
                // **左下のリサイズ（右上固定）**
                let fixedRight = cropData.x + cropData.width;
                let fixedTop = cropData.y;
                newWidth = fixedRight - moveX;
                newHeight = aspect ? newWidth / aspect : moveY - fixedTop;
    
                // **右上のYを固定**
                cropData.x = Math.max(0, moveX);
            }
    
            // **サイズの最小値制限**
            cropData.width = Math.max(10, Math.min(newWidth, cropCanvas.width - cropData.x));
            cropData.height = Math.max(10, Math.min(newHeight, cropCanvas.height - cropData.y));
        }
    
        drawCropBox(ctx);
    }
    
    
    
    function getFixedCorner(corner) {
        return {
            topLeft: { x: "x", y: "y" },
            topRight: { x: "x", y: "y" },
            bottomLeft: { x: "x", y: "y" },
            bottomRight: { x: "x", y: "y" },
        }[corner];
    }

    function stopDragging() {
        dragging = false;
        resizing = false;
        resizingCorner = null;
    }

    cropCanvas.addEventListener("mousedown", startDragging);
    cropCanvas.addEventListener("mousemove", moveCropBox);
    cropCanvas.addEventListener("mouseup", stopDragging);
    cropCanvas.addEventListener("mouseleave", stopDragging);

    cropCanvas.addEventListener("touchstart", startDragging, { passive: false });
    cropCanvas.addEventListener("touchmove", moveCropBox, { passive: false });
    cropCanvas.addEventListener("touchend", stopDragging);
});

document.getElementById("confirmCrop").addEventListener("click", function () {
    const modal = document.getElementById("cropModal");
    modal.style.display = "none";

    // 設定済み表示を更新
    const cropStatus = document.getElementById("cropStatus");
    cropStatus.innerText = "✅ 設定済み";

    localStorage.setItem("cropData", JSON.stringify(cropData));
    document.getElementById("applyCrop").style.display = "inline";
});


// **複数の画像をトリミング**
document.getElementById("applyCrop").addEventListener("click", function () {
    cropData = JSON.parse(localStorage.getItem("cropData"));
    if (!cropData) {
        alert("トリミング範囲を設定してください。");
        return;
    }

    const otherImagesInput = document.getElementById("otherImagesInput");
    if (otherImagesInput.files.length === 0) {
        alert("トリミング範囲を適用する画像を選択してください。");
        return;
    }

    croppedImages = [];

    Array.from(otherImagesInput.files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.src = e.target.result;

            img.onload = function () {
                const outputCanvas = document.createElement("canvas");
                const outputCtx = outputCanvas.getContext("2d");

                outputCanvas.width = cropData.width;
                outputCanvas.height = cropData.height;

                outputCtx.drawImage(img, cropData.x, cropData.y, cropData.width, cropData.height, 0, 0, cropData.width, cropData.height);

                const trimmedFileName = file.name.replace(/\.[^/.]+$/, "") + "_trim.png";

                croppedImages.push({ name: trimmedFileName, dataURL: outputCanvas.toDataURL() });

                document.getElementById("downloadAll").style.display = "inline";
            };
        };
        reader.readAsDataURL(file);
    });

});

// **一括ダウンロード**
document.getElementById("downloadAll").addEventListener("click", function () {
    croppedImages.forEach((img, index) => {
        const link = document.createElement("a");
        link.href = img.dataURL;
        link.download = img.name;

        if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
            // iOSの場合は新しいタブで開く（ダウンロードを促す）
            const newTab = window.open();
            newTab.document.write(`<img src="${img.dataURL}" style="width:100%">`);
        } else {
            // Android / PCはそのままダウンロード
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });
});

// **ポップアップのサイズ調整**
function adjustModalSize() {
    const modal = document.getElementById("cropModal");
    const canvas = document.getElementById("cropCanvas");

    // 画面サイズの 80% 以内に収める
    const maxCanvasWidth = window.innerWidth * 0.8;
    const maxCanvasHeight = window.innerHeight * 0.8;

    // **アスペクト比を保持したまま縮小**
    const imageAspectRatio = imageObj.naturalWidth / imageObj.naturalHeight;
    let newWidth = maxCanvasWidth;
    let newHeight = maxCanvasHeight;

    if (imageAspectRatio > 1) {
        // 横長画像なら幅を基準に調整
        newHeight = newWidth / imageAspectRatio;
    } else {
        // 縦長画像なら高さを基準に調整
        newWidth = newHeight * imageAspectRatio;
    }

    // キャンバスのサイズを設定（アスペクト比を維持）
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;

    // モーダルのスクロール許可
    modal.style.overflow = "auto";
}

// **モーダルを開くときにサイズ調整を適用**
document.getElementById("openCropWindow").addEventListener("click", function () {
    adjustModalSize();
    document.getElementById("cropModal").style.display = "flex";
});

// **ウィンドウサイズ変更時にポップアップサイズを再調整**
window.addEventListener("resize", adjustModalSize);
