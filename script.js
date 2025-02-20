let cropStartX, cropStartY, cropWidth, cropHeight;
let cropping = false;
let imageObj = new Image();

// **1枚目の画像をロード**
document.getElementById("mainImageInput").addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        imageObj.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

// **キャンバスに画像を描画**
const canvas = document.getElementById("mainCanvas");
const ctx = canvas.getContext("2d");

imageObj.onload = function() {
    canvas.width = imageObj.width;
    canvas.height = imageObj.height;
    ctx.drawImage(imageObj, 0, 0);
};

// **トリミング範囲を選択**
canvas.addEventListener("mousedown", function(event) {
    cropping = true;
    cropStartX = event.offsetX;
    cropStartY = event.offsetY;
});

canvas.addEventListener("mousemove", function(event) {
    if (!cropping) return;
    
    const x = event.offsetX;
    const y = event.offsetY;
    cropWidth = x - cropStartX;
    cropHeight = y - cropStartY;
    
    ctx.drawImage(imageObj, 0, 0);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.strokeRect(cropStartX, cropStartY, cropWidth, cropHeight);
});

canvas.addEventListener("mouseup", function() {
    cropping = false;
    document.getElementById("confirmCrop").style.display = "inline";
});

// **他の画像をトリミング**
document.getElementById("confirmCrop").addEventListener("click", function() {
    const otherImagesInput = document.getElementById("otherImagesInput");
    if (otherImagesInput.files.length === 0) {
        alert("トリミング範囲を適用する画像を選択してください。");
        return;
    }

    document.getElementById("output").innerHTML = ""; // クリア
    
    Array.from(otherImagesInput.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.src = e.target.result;

            img.onload = function() {
                const outputCanvas = document.createElement("canvas");
                const outputCtx = outputCanvas.getContext("2d");

                outputCanvas.width = cropWidth;
                outputCanvas.height = cropHeight;

                outputCtx.drawImage(img, cropStartX, cropStartY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

                const imgElement = document.createElement("img");
                imgElement.src = outputCanvas.toDataURL();
                imgElement.style.border = "1px solid black";

                document.getElementById("output").appendChild(imgElement);
            };
        };
        reader.readAsDataURL(file);
    });
});
