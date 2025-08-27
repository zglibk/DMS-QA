<template>
  <textarea :id="tinymceId" />
</template>

<script lang="ts">
  import {
    defineComponent, computed, onMounted, ref, PropType, unref, watch, onBeforeUnmount,
  } from 'vue'
  import type { Editor, RawEditorSettings } from 'tinymce'
  import tinymce from 'tinymce/tinymce'
  import 'tinymce/themes/silver'
  import 'tinymce/icons/default/icons'
  import 'tinymce/plugins/advlist'
  import 'tinymce/plugins/anchor'
  import 'tinymce/plugins/autolink'
  import 'tinymce/plugins/autosave'
  import 'tinymce/plugins/code'
  import 'tinymce/plugins/codesample'
  import 'tinymce/plugins/directionality'
  import 'tinymce/plugins/fullscreen'
  import 'tinymce/plugins/hr'
  import 'tinymce/plugins/insertdatetime'
  import 'tinymce/plugins/link'
  import 'tinymce/plugins/lists'
  import 'tinymce/plugins/image'
  import 'tinymce/plugins/toc'
  import 'tinymce/plugins/nonbreaking'
  import 'tinymce/plugins/noneditable'
  import 'tinymce/plugins/pagebreak'
  import 'tinymce/plugins/paste'
  import 'tinymce/plugins/preview'
  import 'tinymce/plugins/print'
  import 'tinymce/plugins/save'
  import 'tinymce/plugins/searchreplace'
  import 'tinymce/plugins/spellchecker'
  import 'tinymce/plugins/tabfocus'
  import 'tinymce/plugins/table'
  import 'tinymce/plugins/template'
  import 'tinymce/plugins/textpattern'
  import 'tinymce/plugins/visualblocks'
  import 'tinymce/plugins/visualchars'
  import 'tinymce/plugins/wordcount'

  import { plugins as initialPlugins, toolbar as initialToolbar, fontFormats } from './tinymce'
  import { UUID } from 'uuid'

  type Recordable<T = any> = Record<string, T>

  export default defineComponent({
    props: {
      value: {
        type: String,
      },
      disabled: {
        type: Boolean,
        default: false
      },
      options: {
        type: Object as PropType<Partial<RawEditorSettings>>,
        default: () => ({}),
      },
      toolbar: {
        type: String,
        default: initialToolbar,
      },
      plugins: {
        type: Array as PropType<string[]>,
        default: initialPlugins,
      },
      height: {
        type: [Number, String] as PropType<string | number>,
        required: false,
        default: 400,
      },
      width: {
        type: [Number, String] as PropType<string | number>,
        required: false,
        default: 'auto',
      },
    },
    emits: ['change', 'update:value'],
    setup(props, { emit }) {
      const tinymceId = ref<string>(UUID())
      const editorRef = ref<Editor>()

      const initOptions = computed((): RawEditorSettings => {
        const publicPath = __webpack_public_path__

        const {
          height, options, toolbar, plugins,
        } = props
        return {
          selector: `#${tinymceId.value}`,
          language_url: `${publicPath}tinymce/langs/zh_CN.js`,
          language: 'zh_CN',
          skin_url: `${publicPath}tinymce/skins/ui/oxide`,
          content_css: `${publicPath}tinymce/skins/ui/oxide/content.min.css`,
          images_upload_handler: handleImgUpload,
          images_file_types: 'jpeg,jpg,png,gif,bmp,webp', // 准许的图片格式
          convert_urls: false,
          branding: false, // 隐藏品牌，隐藏状态栏中显示的“ Powered by Tiny ”链接
          placeholder: '请输入内容', // 占位符
          toolbar,
          plugins,
          height,
          toolbar_mode: 'sliding',
          toolbar_sticky: true,
          paste_block_drop: true, // 禁用将内容拖放到编辑器中
          paste_data_images: false, // 粘贴data格式的图像 谷歌浏览器无法粘贴
          font_formats: fontFormats,
          paste_retain_style_properties: 'color border border-left border-right border-bottom border-top', // MS Word 和类似 Office 套件产品保留样式
          paste_webkit_styles: 'none', // 允许在 WebKit 中粘贴时要保留的样式
          paste_tab_spaces: 2, // 将制表符转换成空格的个数
          content_style: `
          html, body                { height:100%; }
          img                       { max-width:100%; display:block;height:auto; }
          a                         { text-decoration: none; }
          p                         { line-height:1.6; margin: 0px; }
          table                     { word-wrap:break-word; word-break:break-all;max-width:100%; border:none; border-color:#999; }
          .mce-object-iframe        { width:100%; box-sizing:border-box; margin:0; padding:0; }
          ul,ol                     { list-style-position:inside; }
          `,
          ...options,
          setup: (editor: Editor) => {
            editorRef.value = editor
            editor.on('init', initSetup)
          },
        }
      })

      onMounted(() => {
        tinymce.init(initOptions.value)
      })

      onBeforeUnmount(() => {
        destory()
      })

      function destory() {
        if (tinymce !== null) {
          tinymce?.remove?.(unref(initOptions).selector!)
        }
      }

      // 图片上传自定义逻辑
      function handleImgUpload(blobInfo, success, failure, progress) {
        console.log('blobInfo', blobInfo.blob(), blobInfo.filename())
        const { type: fileType, name: fileName } = blobInfo.blob()
        // xxxx 自定义上传逻辑
      }

      // 编辑器初始化
      function initSetup() {
        const editor = unref(editorRef)
        if (!editor) {
          return
        }
        const value = props.value || ''

        editor.setContent(value)
        bindModelHandlers(editor)
      }

      function setValue(editor: Recordable, val: string, prevVal?: string) {
        if (
          editor
          && typeof val === 'string'
          && val !== prevVal
          && val !== editor.getContent()
        ) {
          editor.setContent(val)
        }
      }

      function bindModelHandlers(editor: any) {
        watch(
          () => props.value,
          (val: string, prevVal) => setValue(editor, val, prevVal),
          { immediate: true },
        )
        watch(
          () => props.disabled,
          val => {
            editor.setMode(val ? 'readonly' : 'design')
          },
          { immediate: true },
        )
        editor.on('change keyup undo redo', () => {
          const content = editor.getContent()
          emit('update:value', content)
          emit('change', content)
        })
      }

      return {
        tinymceId,
      }
    },
  })
</script>

