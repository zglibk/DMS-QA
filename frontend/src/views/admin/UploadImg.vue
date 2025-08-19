<template>
    <div>
        <div
            :class="[
                'upload',
                `upload-${shape}`
            ]"
            :style="{ backgroundImage: 'url(' + (imgUrl) + ')' }"
            @click="openUpload"></div>
        <!-- 上传弹窗 -->
        <el-dialog
            v-model="uploadDialog"
            title="更换头像"
            width="560px"
            append-to-body
            :close-on-click-modal="false"
            @close="handleClose">
            <div class="container">
                <!-- 左侧裁剪区 -->
                <div class="left">
                    <!-- 大图显示区 -->
                    <!-- :style="{ 'background-image': 'url(' + imgUrl + ')' }" -->
                    <div class="big-image-preview">
                        <img :src="imgUrl" alt="大图" class="big-image" ref="imageRef" />
                    </div>
                    <div class="tool">
                        <i class="el-icon-refresh-left" @click="rotateImage(-45)"></i>
                        <i class="el-icon-circle-plus-outline" @click="zoomImage(0.2)"></i>
                        <i class="el-icon-remove-outline" @click="zoomImage(-0.2)"></i>
                        <i class="el-icon-refresh-right" @click="rotateImage(45)"></i>
                    </div>
                </div>
                <!-- 右侧预览区 -->
                <div class="right">
                    <!-- 小图预览区域 -->
                    <div class="right-top">
                        <div>预览</div>
                        <div
                            class="image-view"
                            :style="{ width: '100px', height: '100px', 'border-radius': shape == 'default' ? '10px' : '50%' }"></div>
                        <div>100 x 100</div>
                        <div
                            class="image-view"
                            :style="{ width: '50px', height: '50px', 'border-radius': shape == 'default' ? '10px' : '50%' }"></div>
                        <div>50 x 50</div>
                    </div>
                    <!-- 按钮 -->
                    <div class="right-bottom">
                        <div>
                            <el-button type="primary" size="small" @click="chooseImage">上传</el-button>
                            <el-button type="primary" size="small" @click="uploadImage">确定</el-button>
                        </div>
                    </div>
                </div>
            </div>
            <!-- 只用input来实现上传，但是不显示input -->
            <input
                v-show="false"
                ref="fileRef"
                type="file"
                accept="image/png, image/jpeg"
                @change="getImageInfo" />
        </el-dialog>
    </div>
</template>

<script>
import { defineComponent, nextTick, onMounted, ref, watch } from 'vue';
import 'cropperjs/dist/cropper.css';
import Cropper from 'cropperjs';
import { ElMessage } from 'element-plus';
export default defineComponent({

    props: {
        // 形状
        shape: {
            type: String,
            default: 'round',
            validator: (val) => {
                return ['default', 'round'].includes(val);
            }
        },
        // 上传地址
        uploadUrl: {
            type: String,
            default: ''
        },
        // 当前用户头像数据
        currentAvatar: {
            type: String,
            default: ''
        }
    },
    emits: ['upload-success'],
    setup(props, { emit }) {
        // 默认显示的图片 - 优先显示传入的当前用户头像，否则显示默认图像
        const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik03NSA0NUMxMDEuNTEgNDUgMTIzIDY2LjQ5IDEyMyA5M0MxMjMgMTE5LjUxIDEwMS41MSAxNDEgNzUgMTQxQzQ4LjQ5IDE0MSAyNyAxMTkuNTEgMjcgOTNDMjcgNjYuNDkgNDguNDkgNDUgNzUgNDVaIiBmaWxsPSIjRERERERGIi8+CjxwYXRoIGQ9Ik03NSA2NkM4NS40OTMgNjYgOTQgNzQuNTA3IDk0IDg1Qzk0IDk1LjQ5MyA4NS40OTMgMTA0IDc1IDEwNEM2NC41MDcgMTA0IDU2IDk1LjQ5MyA1NiA4NUM1NiA3NC41MDcgNjQuNTA3IDY2IDc1IDY2WiIgZmlsbD0iI0JCQkJCQiIvPgo8cGF0aCBkPSJNNDUgMTIwQzQ1IDEwNi43NDMgNTYuNzQzIDk2IDcwIDk2SDgwQzkzLjI1NyA5NiAxMDUgMTA2Ljc0MyAxMDUgMTIwVjEzNUg0NVYxMjBaIiBmaWxsPSIjQkJCQkJCIi8+Cjwvc3ZnPgo=';
        let imgUrl = ref(props.currentAvatar || defaultAvatar);
        
        // 监听currentAvatar属性变化，更新显示的头像
        watch(() => props.currentAvatar, (newAvatar) => {
            imgUrl.value = newAvatar || defaultAvatar;
        });
        // 裁剪对象
        let cropper;

        /**
         * 处理弹窗相关
         */
        let handleDialog = () => {
            // 打开上传弹窗
            let uploadDialog = ref(false);
            // 打开弹窗方法
            let openUpload = () => {
                uploadDialog.value = true;
            };
            // 关闭弹窗
            let handleClose = () => {
                uploadDialog.value = false;
                // 安全地销毁cropper实例
                if (cropper) {
                    cropper.destroy();
                    cropper = null;
                }
            };

            // input文件ref
            let fileRef = ref(null);
            // 选择图片
            let chooseImage = () => {
                // 当input的type属性值为file时，点击方法可以进行选取文件
                fileRef.value.click();
            };
            // 上传头像
            let uploadImage = () => {
                if (!cropper) {
                    ElMessage.error('请先选择图片');
                    return;
                }
                
                let cas = cropper.getCroppedCanvas();
                if (!cas) {
                    ElMessage.error('图片裁剪失败，请重试');
                    return;
                }
                
                // 压缩图片质量
                let quality = 0.8;
                let base64url = cas.toDataURL('image/jpeg', quality);
                
                // 如果图片过大，继续压缩
                while (base64url.length > 2000000 && quality > 0.1) {
                    quality -= 0.1;
                    base64url = cas.toDataURL('image/jpeg', quality);
                }
                
                if (base64url.length > 2000000) {
                    ElMessage.error('头像图片过大，请选择更小的图片');
                    return;
                }                
                
                // 发出上传成功事件
                emit('upload-success', base64url);
                
                // 关闭对话框
                uploadDialog.value = false;
            };

            return {
                uploadDialog,
                openUpload,
                handleClose,
                fileRef,
                chooseImage,
                uploadImage
            };
        };

        // 处理图片上传
        let handleImageUpload = () => {
            // 裁剪的图片
            let imageRef = ref(null);

            // 获取文件信息
            let getImageInfo = (e) => {
                // 上传的文件
                let file = e.target.files[0];
                if (!file) {
                    return false;
                }
                
                let fileSize = (file.size / 2048).toFixed(2);
                if(fileSize > 2048) {
                    ElMessage.warning('图片大小必须在2MB以内！');
                    return false;
                }
                
                // 获取 window 的 URL 工具
                let URL = window.URL || window.webkitURL;
                
                // 如果之前有URL，先释放它
                if (imgUrl.value && imgUrl.value.startsWith('blob:')) {
                    URL.revokeObjectURL(imgUrl.value);
                }
                
                // 通过 file 生成目标 url
                imgUrl.value = URL.createObjectURL(file);
                
                // 清空文件输入框，确保可以重新选择同一文件
                e.target.value = '';
                nextTick(() => {
                    // 判定裁剪对象是否存在
                    // 存在销毁重新创建（这里不替换图片，图片不一样大时会变形），不存在创建对象
                    if(cropper) {
                        cropper.destroy();
                        cropper = null;
                        cropImage();
                    }else{
                        cropImage();
                    }
                });
            };

            // 裁剪图片
            let cropImage = () => {
                if (imageRef.value) {
                    cropper = new Cropper(imageRef.value, {
                        // 宽高比
                        aspectRatio: 1,
                        viewMode: 1,
                        // 预览
                        preview: '.image-view',
                        // cropBoxResizable: false,
                        background: false,
                        crop(event) {
                            // console.log('裁剪');
                        }
                    });
                }
            };

            // 旋转
            let rotateImage = (angle) => {
                cropper.rotate(angle);
            };

            // 缩放
            let zoomImage = (num) => {
                cropper.zoom(num);
            };

            return {
                imageRef,
                getImageInfo,
                cropImage,
                rotateImage,
                zoomImage
            };
        };

        return {
            imgUrl,
            ...handleDialog(),
            ...handleImageUpload()
        };
    }

});
</script>

<style scoped lang="scss">
//上传的基本样式
.upload {
    width: 150px;
    height: 150px;
    border: 5px solid #eeeeee;
    box-sizing: border-box;
    cursor: pointer;
    background-position: center center;
    background-size: 100%;
}

//hover的基本样式
.base-hover {
    position: absolute;
    width: 100%;
    height: 100%;
    content: "更换头像";
    background: black;
    color: #ffffff;
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0.6;
}

//默认形状
.upload-default {
    border-radius: 5px;
    position: relative;

    &:hover {
        &::before {
            @extend .base-hover;
            border-radius: 5px;
        }
    }
}

//圆形
.upload-round {
    border-radius: 50%;
    position: relative;

    &:hover {
        &::before {
            @extend .base-hover;
            border-radius: 50%;
        }
    }
}

.container {
    width: 520px;
    height: 400px;
    display: flex;
    .left {
        width: 65%;
        height: 100%;

        .big-image-preview {
            width: 100%;
            height: 85%;
            background-size: 100% 100%;
            background-repeat: no-repeat;
            background-position: center center;
        }

        .tool {
            width: 100%;
            height: 15%;
            font-size: 30px;
            display: flex;
            justify-content: center;
            align-items: center;
            i {
                margin: 0px 10px;
                cursor:pointer;
            }
        }
        .big-image {
            width: 100%;
            height: 100%;
            display: block;
            max-width: 100%;
        }
    }
    .right {
        width: 35%;
        height: 100%;
        font-size: 14px;

        .right-top {
            width: 100%;
            height: 70%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-evenly;
            .image-view {
                border: 1px solid gray;
                overflow: hidden;
            }
        }
        .right-bottom{
            width: 100%;
            height: 30%;
            display: flex;
            flex-direction: column-reverse;
            align-items: center;
        }
    }
}
</style>