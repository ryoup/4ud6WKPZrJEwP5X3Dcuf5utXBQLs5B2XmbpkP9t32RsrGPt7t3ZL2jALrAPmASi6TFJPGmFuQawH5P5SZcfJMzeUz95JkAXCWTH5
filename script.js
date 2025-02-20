let cropData = { x: 50, y: 50, width: 100, height: 100 };
let aspectRatio = "free"; // デフォルトはフリー
let dragging = false;
let resizing = false;
let startX, startY;
let croppedImages = [];

// **アスペクト比選択**
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
        ctx.drawImage(imageObj, 0, 0);
    
        // トリミングボックスの視認性を向上
        ctx.strokeStyle = "red";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 3]); // 破線
        ctx.strokeRect(cropData.x, cropData.y, cropData.width, cropData.height);
    
        // 半透明の背景を追加
        ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
        ctx.fillRect(cropData.x, cropData.y, cropData.width, cropData.height);
    }
    

    function startDragging(event) {
        event.preventDefault();
        const pos = getCanvasCoordinates(event);
        startX = pos.x;
        startY = pos.y;

        if (
            startX > cropData.x &&
            startX < cropData.x + cropData.width &&
            startY > cropData.y &&
            startY < cropData.y + cropData.height
        ) {
            dragging = true;
        } else {
            cropData.x = startX;
            cropData.y = startY;
            resizing = true;
        }
    }

    function moveCropBox(event) {
        if (!dragging && !resizing) return;
        event.preventDefault();

        const pos = getCanvasCoordinates(event);
        let moveX = pos.x;
        let moveY = pos.y;

        let newWidth = cropData.width;
        let newHeight = cropData.height;

        if (dragging) {
            cropData.x = Math.max(0, Math.min(moveX - cropData.width / 2, cropCanvas.width - cropData.width));
            cropData.y = Math.max(0, Math.min(moveY - cropData.height / 2, cropCanvas.height - cropData.height));
        } else if (resizing) {
            if (aspectRatio === "1:1") {
                newWidth = newHeight = Math.min(moveX - cropData.x, moveY - cropData.y);
            } else if (aspectRatio === "4:3") {
                newWidth = moveX - cropData.x;
                newHeight = Math.round(newWidth * 3 / 4);
            } else if (aspectRatio === "3:4") {
                newWidth = moveX - cropData.x;
                newHeight = Math.round(newWidth * 4 / 3);
            } else {
                newWidth = moveX - cropData.x;
                newHeight = moveY - cropData.y;
            }

            cropData.width = Math.max(10, Math.min(newWidth, cropCanvas.width - cropData.x));
            cropData.height = Math.max(10, Math.min(newHeight, cropCanvas.height - cropData.y));
        }

        drawCropBox(ctx);
    }

    function stopDragging() {
        dragging = false;
        resizing = false;
    }

    cropCanvas.addEventListener("mousedown", startDragging);
    cropCanvas.addEventListener("mousemove", moveCropBox);
    cropCanvas.addEventListener("mouseup", stopDragging);
    cropCanvas.addEventListener("mouseleave", stopDragging);

    cropCanvas.addEventListener("touchstart", startDragging, { passive: false });
    cropCanvas.addEventListener("touchmove", moveCropBox, { passive: false });
    cropCanvas.addEventListener("touchend", stopDragging);

    document.getElementById("confirmCrop").addEventListener("click", function () {
        modal.style.display = "none";
        localStorage.setItem("cropData", JSON.stringify(cropData));
        document.getElementById("applyCrop").style.display = "inline";
    });
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
