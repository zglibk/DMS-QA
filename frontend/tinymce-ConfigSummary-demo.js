width: '100%', //  设置富文本编辑器宽度
height: '100%', //  设置富文本编辑器高度
menubar: false, // 设置富文本编辑器菜单, 默认true
branding: false, // 关闭底部官网提示 默认true
statusbar: true, // 显示底部状态栏 默认true
readonly: false, // 设置只读属性 默认 false
resize: false, // 调节编辑器大小 默认 true
branding: false, // 隐藏状态栏右下角显示的品牌
placeholder: '请输入内容', // 占位符

theme: 'silver', // 主题 必须引入
skin_url: '/tinymce/skins/ui/oxide', // 主题路径
icons: 'custom',  // 自定义图标名称
icons_url: '/tinymce/icons/icons.js', // 自定义图标路径
language_url: '/tinymce/langs/zh_CN.js', // 中文化 默认为英文
language: 'zh_CN', // 设置富文本编辑器语言
content_css: `/tinymce/skins/content/default`, // 富文本编辑器内容区域样式
content_style: 'body, p{font-size: 12px}', // 为内容区编辑自定义css样式

plugins: ['autosave help textpattern lineheight'], // 插件配置
toolbar: 'fontselect styleselect fontsizeselect restoredraft undo redo | bold italic underline strikethrough subscript superscript removeformat forecolor backcolor lineheight align outdent indent help', // 工具栏配置
toolbar_mode: 'sliding', // sliding生效条件toolbar必须为字符串,且有'|'区分,不能为数组
toolbar_sticky: true, // 粘性工具栏 默认false (在向下滚动网页直到不再可见编辑器时，将工具栏和菜单停靠在屏幕顶部)

// 快速工具栏配置，需引入插件 quickbars
quickbars_selection_toolbar: 'bold italic underline strikethrough | link h2 h3 h4 blockquote', // 设置 快速选择 触发提供的工具栏 需引入插件  默认 'alignleft aligncenter alignright' 设置为false禁用
quickbars_insert_toolbar: 'quickimage quicktable', // 设置 快速插入 触发提供的工具栏 需引入插件quickbars 默认 quickimage quicktable 设置为false禁用

// font 相关配置
fontsize_formats: '12px 14px 16px 18px 20px 22px 24px 26px 36px 48px 56px', // 工具栏自定义字体大小选项
font_formats: "微软雅黑='微软雅黑'; 宋体='宋体'; 黑体='黑体'; 仿宋='仿宋'; 楷体='楷体'; 隶书='隶书'; 幼圆='幼圆'; 方正舒体='方正舒体'; 方正姚体='方正姚体'; 等线='等线'; 华文彩云='华文彩云'; 华文仿宋='华文仿宋'; 华文行楷='华文行楷'; 华文楷体='华文楷体'; 华文隶书='华文隶书'; Andale Mono=andale mono,times; Arial=arial; Arial Black=arial black;avant garde; Book Antiqua=book antiqua;palatino; Comic Sans MS=comic sans ms; Courier New=courier new;courier; Georgia=georgia; Helvetica=helvetica; Impact=impact;chicago; Symbol=symbol; Tahoma=tahoma;arial; sans-serif; Terminal=terminal,monaco; Times New Roman=times new roman,times; Trebuchet MS=trebuchet ms; Verdana=verdana;geneva; Webdings=webdings; Wingdings=wingdings", // 工具栏自定义字体选项

// autosave 插件配置，需引入插件 autosave
autosave_ask_before_unload: true, // 阻止有内容时浏览器阻塞行为, 默认 true
autosave_interval: '3s', // 设置自动保存为草稿时间 单位只能为s 
autosave_prefix: `editor_${route.path}`, // 设置自动保存为草稿时前缀 本地localStorage中存储
autosave_retention: '300m', // 自动草稿的有效期 单位只能为m(分钟)

// image 相关配置，需引入插件image
images_upload_handler: (blobInfo, success, failure) => {
    // 发送请求, 获取图片路径后, 将路径传给success
    success('xxxx')
}, // 图片上传函数 
image_advtab: true, // 为上传图片窗口添加高级属性

// paste 相关配置，需引入插件paste
paste_data_images: true, // 粘贴data格式的图像
paste_block_drop: true, // 禁用将内容拖放到编辑器中
paste_as_text: true, // 默认粘贴为文本
paste_retain_style_properties: 'color border', // MS Word 和类似 Office 套件产品保留样式

// template 内容模板配置，需引入插件template
templates: [{ title: '标题', description: '描述', content: '内容' }], // 内容模板

// 快速排版配置，需引入插件 textpattern
textpattern_patterns: [
    { start: '*', end: '*', format: 'italic' },
    { start: '**', end: '**', format: 'bold' },
    { start: '#', format: 'h1' },
    { start: '##', format: 'h2' },
    { start: '###', format: 'h3' },
    { start: '####', format: 'h4' },
    { start: '#####', format: 'h5' },
    { start: '######', format: 'h6' },
    { start: '1. ', cmd: 'InsertOrderedList' },
    { start: '* ', cmd: 'InsertUnorderedList' },
    { start: '- ', cmd: 'InsertUnorderedList' }
], // 快速排版  类似于markdown

init_instance_callback: editor => { // 初始化结束后执行, 里面实现双向数据绑定功能
    editor.on('Input undo redo Change execCommand SetContent', (e) => {
    // editor.getContent({ format: ''text }) // 获取纯文本
    $emit('change', editor.getContent())
})
},

setup: (editor) => { // 初始化前执行
// xxxx
}
