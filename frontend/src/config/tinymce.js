/**
 * TinyMCE 编辑器配置文件
 * 包含插件、工具栏和字体格式的完整配置
 */

// TinyMCE 插件配置 - 优化版本，减少不必要插件提升性能
export const plugins = [
  'advlist', 'autolink', 'code', 'fullscreen', 'link', 'lists', 'paste', 
  'searchreplace', 'table', 'image', 'quickbars', 'charmap', 'wordcount'
]

// 完整插件列表（按需启用）
export const pluginsFull = [
  'advlist', 'anchor', 'autolink', 'autosave', 'code', 'codesample', 'directionality', 
  'fullscreen', 'hr', 'insertdatetime', 'link', 'lists', 'nonbreaking', 'noneditable', 
  'pagebreak', 'paste', 'preview', 'print', 'save', 'searchreplace', 'tabfocus', 
  'template', 'textpattern', 'visualblocks', 'visualchars', 'wordcount', 'table', 
  'image', 'toc', 'quickbars', 'charmap', 'emoticons', 'help', 'media'
]

// TinyMCE 工具栏配置 - 优化布局，字体颜色工具前置
export const toolbar = 'undo redo | bold italic underline strikethrough | forecolor backcolor | fontselect fontsizeselect formatselect | alignleft aligncenter alignright alignjustify | outdent indent | numlist bullist | link image table | charmap | fullscreen code'

// 多行工具栏配置（备用）
export const toolbarMultiple = [
  'undo redo | bold italic underline strikethrough | fontselect fontsizeselect formatselect',
  'alignleft aligncenter alignright alignjustify | outdent indent | numlist bullist',
  'forecolor backcolor | link image media table | charmap emoticons hr',
  'fullscreen preview save print | code codesample | searchreplace help'
]

// 单行工具栏配置（可选）
export const toolbarSingle = 'undo redo | bold italic underline strikethrough | fontselect fontsizeselect formatselect | alignleft aligncenter alignright alignjustify | outdent indent | numlist bullist | forecolor backcolor | link image media table | charmap emoticons | fullscreen preview | code help'

// TinyMCE 字体格式配置 - 包含中文、英文和专业代码字体
export const fontFormats = '微软雅黑="Microsoft YaHei","Helvetica Neue","PingFang SC",sans-serif;苹果苹方="PingFang SC","Microsoft YaHei",sans-serif;宋体=simsun,serif;黑体=SimHei,sans-serif;楷体=KaiTi,serif;仿宋=FangSong,serif;Consolas=Consolas,"Lucida Console","Courier New",monospace;Monaco=Monaco,"Menlo","Ubuntu Mono",monospace;Source Code Pro="Source Code Pro",Consolas,"Liberation Mono",Menlo,Courier,monospace;Fira Code="Fira Code",Consolas,"Liberation Mono",Menlo,Courier,monospace;JetBrains Mono="JetBrains Mono",Consolas,"Liberation Mono",Menlo,Courier,monospace;Arial=arial,helvetica,sans-serif;Arial Black="arial black","avant garde";Book Antiqua="book antiqua",palatino;Comic Sans MS="comic sans ms",sans-serif;Courier New="courier new",courier,monospace;Georgia=georgia,palatino;Helvetica=helvetica;Impact=impact,chicago;Tahoma=tahoma,arial,helvetica,sans-serif;Times New Roman="times new roman",times;Trebuchet MS="trebuchet ms",geneva;Verdana=verdana,geneva'

// 字体大小配置
export const fontSizeFormats = '8px 10px 12px 14px 16px 18px 20px 24px 28px 32px 36px 48px 56px 72px'

// 块格式配置
export const blockFormats = '段落=p;标题1=h1;标题2=h2;标题3=h3;标题4=h4;标题5=h5;标题6=h6;预格式化=pre;引用=blockquote'

// 快速工具栏配置
export const quickbarsConfig = {
  quickbars_selection_toolbar: 'bold italic underline strikethrough | link h2 h3 h4 blockquote',
  quickbars_insert_toolbar: 'quickimage quicktable'
}

// 内容模板配置
export const templates = [
  {
    title: '基础模板',
    description: '包含标题和段落的基础模板',
    content: '<h2>标题</h2><p>这里是内容段落...</p>'
  },
  {
    title: '通知模板',
    description: '系统通知专用模板',
    content: '<div style="border-left: 4px solid #409eff; padding: 10px; background: #f0f9ff;"><h3>📢 重要通知</h3><p><strong>发布时间：</strong></p><p><strong>通知内容：</strong></p><p><strong>注意事项：</strong></p></div>'
  }
]

// 文本模式配置
export const textPatterns = [
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
]

// 默认编辑器配置
export const defaultConfig = {
  base_url: '/tinymce', // 设置TinyMCE基础路径
  language_url: '/tinymce/language/zh_CN.js',
  language: 'zh_CN',
  skin_url: '/tinymce/skins/ui/oxide',
  content_css: '/tinymce/skins/ui/oxide/content.min.css',
  plugins,
  toolbar,
  font_formats: fontFormats,
  font_size_formats: fontSizeFormats,
  block_formats: blockFormats,
  height: 400,
  width: '100%',
  placeholder: '请输入内容...',
  
  // 性能优化配置
  cache_suffix: '?v=6.8.0', // 缓存版本控制
  init_instance_callback: function(editor) {
    // 延迟初始化，减少卡顿
    setTimeout(() => {
      editor.focus()
    }, 100)
  },
  
  // 工具栏配置
  toolbar_mode: 'sliding', // 滑动工具栏模式
  toolbar_sticky: true, // 粘性工具栏
  
  // 快速工具栏配置
  ...quickbarsConfig,
  
  // 内容模板配置
  templates,
  
  // 文本模式配置
  textpattern_patterns: textPatterns,
  
  // 内容样式配置
  content_style: `
    html, body { 
      height: auto !important; 
      min-height: auto !important;
      overflow: visible !important;
    }
    body { 
      font-family: Microsoft YaHei, Helvetica Neue, PingFang SC, sans-serif; 
      font-size: 14px; 
      line-height: 1.6; 
      margin: 8px;
      padding: 8px;
      min-height: auto !important;
      height: auto !important;
      overflow: visible !important;
    }
    img { max-width: 100%; display: inline-block; height: auto; vertical-align: middle; }
    .img-responsive { max-width: 100%; height: auto; }
    .img-rounded { border-radius: 8px; }
    .img-thumbnail { border: 1px solid #ddd; padding: 4px; border-radius: 4px; max-width: 200px; }
    a { text-decoration: none; color: #409eff; }
    p { margin: 0 0 10px 0; }
    table { 
      word-wrap: break-word; 
      word-break: break-all; 
      max-width: 100%; 
      border-collapse: collapse;
      border: 1px solid #ddd;
    }
    table td, table th {
      border: 1px solid #ddd;
      padding: 8px;
    }
    blockquote {
      border-left: 4px solid #ddd;
      margin: 0 0 10px 0;
      padding: 10px 15px;
      background: #f9f9f9;
    }
    code {
      background: #f4f4f4;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: Consolas, Monaco, monospace;
    }
    pre {
      background: #f4f4f4;
      padding: 10px;
      border-radius: 5px;
      overflow-x: auto;
    }
  `,
  
  // 图片上传配置
  images_file_types: 'jpeg,jpg,png,gif,bmp,webp',
  images_upload_max_size: 5 * 1024 * 1024, // 5MB
  image_advtab: true, // 图片高级选项卡
  image_dimensions: true, // 启用图片尺寸编辑
  image_class_list: [
    { title: '无样式', value: '' },
    { title: '响应式图片', value: 'img-responsive' },
    { title: '圆角图片', value: 'img-rounded' },
    { title: '缩略图', value: 'img-thumbnail' }
  ],
  // 图片默认设置
  image_caption: true, // 启用图片标题
  image_title: true, // 启用图片标题属性
  // 设置粘贴图片的默认最大宽度
  images_reuse_filename: true, // 重用文件名
  // 图片粘贴时的默认处理
  paste_preprocess: function(plugin, args) {
    // 处理粘贴的图片，设置默认最大宽度
    if (args.content.indexOf('<img') !== -1) {
      args.content = args.content.replace(/<img([^>]*)>/gi, function(match, attrs) {
        // 如果图片没有设置宽度，添加默认最大宽度
        if (attrs.indexOf('width') === -1 && attrs.indexOf('style') === -1) {
          return '<img' + attrs + ' style="max-width: 600px; height: auto;">';
        }
        return match;
      });
    }
  },
  
  // 自动保存配置
  autosave_ask_before_unload: true,
  autosave_interval: '30s',
  autosave_prefix: 'tinymce-autosave-{path}{query}-{id}-',
  autosave_restore_when_empty: false,
  autosave_retention: '30m',
  
  // 粘贴配置
  paste_data_images: true, // 允许粘贴图片
  paste_as_text: false, // 不强制粘贴为纯文本
  paste_block_drop: false, // 允许拖放内容
  paste_retain_style_properties: 'color border border-left border-right border-bottom border-top background-color',
  paste_webkit_styles: 'color font-size font-family background-color',
  paste_tab_spaces: 2,
  
  // 界面配置
  branding: false, // 隐藏 TinyMCE 品牌信息
  elementpath: false, // 隐藏元素路径
  resize: true, // 允许调整大小
  statusbar: true, // 显示状态栏
  menubar: false, // 隐藏菜单栏
  contextmenu: 'link image table spellchecker', // 右键菜单
  
  // 层级配置 - 终极解决方案，确保绝对显示在最上层
  z_index: 100000, // 设置编辑器的 z-index 值
  z_index_base: 100000, // 设置基础 z-index 值
  
  // 其他功能配置
  convert_urls: false, // 不转换URL
  remove_script_host: false,
  relative_urls: false,
  
  // P标签处理配置 - 解决内容头尾部自动添加P标签的问题
  forced_root_block: '', // 不强制添加根块元素（P标签）
  force_p_newlines: false, // 不强制在换行时添加P标签
  remove_trailing_brs: true, // 移除尾部的br标签
  element_format: 'html', // 使用HTML格式而不是XHTML
  entity_encoding: 'raw', // 使用原始编码，不转换特殊字符
  
  // 代码高亮配置
  codesample_languages: [
    { text: 'HTML/XML', value: 'markup' },
    { text: 'JavaScript', value: 'javascript' },
    { text: 'TypeScript', value: 'typescript' },
    { text: 'CSS', value: 'css' },
    { text: 'SCSS', value: 'scss' },
    { text: 'PHP', value: 'php' },
    { text: 'Ruby', value: 'ruby' },
    { text: 'Python', value: 'python' },
    { text: 'Java', value: 'java' },
    { text: 'C', value: 'c' },
    { text: 'C#', value: 'csharp' },
    { text: 'C++', value: 'cpp' },
    { text: 'SQL', value: 'sql' },
    { text: 'JSON', value: 'json' }
  ],
  
  // 表格配置
  table_default_attributes: {
    border: '1'
  },
  table_default_styles: {
    'border-collapse': 'collapse',
    'width': '100%'
  }
}