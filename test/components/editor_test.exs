defmodule CKEditor5.Components.EditorTest do
  use CKEditor5.Test.PresetsTestCaseTemplate, async: true

  import Phoenix.LiveViewTest
  import Phoenix.Component

  alias CKEditor5.Components.Editor
  alias CKEditor5.Errors.Error
  alias Phoenix.HTML

  setup do
    put_presets_env(%{
      "mock" => %{
        type: :inline,
        custom_translations: %{
          en: %{
            bold: "Custom translation"
          }
        },
        config: %{
          toolbar: ["bold"]
        }
      }
    })

    :ok
  end

  test "renders editor with default attributes" do
    html = render_component(&Editor.render/1, id: "editor1", name: "content", value: "Hello")
    assert html =~ ~s(phx-hook="CKEditor5")
    assert html =~ ~s(id="editor1")
    assert html =~ ~s(cke-initial-value="Hello")
    assert html =~ ~s(<div id="editor1_editor"></div>)
    assert html =~ ~s(<textarea)
  end

  test "renders editor without name (no hidden input)" do
    html = render_component(&Editor.render/1, id: "editor3", value: "No input")
    refute html =~ ~s(<textarea)
  end

  test "it is possible to pass CSS class to component" do
    html =
      render_component(&Editor.render/1, id: "editor1", name: "content", class: "custom-class")

    assert html =~ ~s(class="custom-class")
  end

  test "it should assign random ID if missing" do
    html = render_component(&Editor.render/1, name: "content")
    assert html =~ ~s(id="cke-)
    assert html =~ ~s(phx-hook="CKEditor5")
  end

  test "it is possible to merge CSS styles with component styles " do
    html =
      render_component(&Editor.render/1, id: "editor1", name: "content", style: "color: red;")

    assert html =~ ~s(style="position: relative; color: red;")
  end

  test "it is possible to pass CSS object styles to component" do
    html =
      render_component(&Editor.render/1,
        id: "editor1",
        name: "content",
        style: %{"color" => "red", "height" => "500px"}
      )

    assert html =~ ~s(style="position: relative; color: red; height: 500px;")
  end

  test "it should ignore CSS style if has no separator" do
    html =
      render_component(&Editor.render/1,
        id: "editor1",
        name: "content",
        style: "colorred"
      )

    assert html =~ ~s(style="position: relative;")
  end

  describe "preset type handling" do
    test "uses classic type when no type and preset are specified" do
      html = render_component(&Editor.render/1, id: "editor1", name: "content")
      assert html =~ ~s(type&quot;:&quot;classic&quot;)
    end

    test "uses type defined in custom preset" do
      html = render_component(&Editor.render/1, id: "editor1", name: "content", preset: "mock")
      assert html =~ ~s(type&quot;:&quot;inline&quot;)
    end

    test "uses type defined as string in custom preset" do
      html =
        render_component(&Editor.render/1,
          id: "editor1",
          name: "content",
          preset: "mock",
          type: "inline"
        )

      assert html =~ ~s(type&quot;:&quot;inline&quot;)
      assert html =~ ~s(Custom translation)
    end

    test "uses dynamic defined preset object" do
      preset = %CKEditor5.Preset{
        type: :inline,
        custom_translations: %{
          en: %{
            bold: "Dynamic translation"
          }
        },
        config: %{
          toolbar: ["bold"]
        }
      }

      html =
        render_component(&Editor.render/1,
          id: "editor_dynamic",
          name: "content_dynamic",
          preset: preset
        )

      assert html =~ ~s(type&quot;:&quot;inline&quot;)
      assert html =~ ~s(Dynamic translation)
    end

    test "overrides editor type to classic when type is set to :classic" do
      html =
        render_component(&Editor.render/1,
          id: "editor2",
          name: "content2",
          preset: "mock",
          type: :classic
        )

      assert html =~ ~s(type&quot;:&quot;classic&quot;)
    end

    test "throws error for invalid type" do
      message = "Invalid editor type provided: invalid_type"

      assert_raise Error, message, fn ->
        render_component(&Editor.render/1, id: "editor3", name: "content3", type: :invalid_type)
      end
    end
  end

  describe "editable height handling" do
    test "sets editable height when specified" do
      html =
        render_component(&Editor.render/1,
          id: "editor4",
          name: "content4",
          editable_height: "300px"
        )

      assert html =~ ~s(cke-editable-height="300")
    end

    test "does not set editable height when not specified" do
      html = render_component(&Editor.render/1, id: "editor5", name: "content5")
      refute html =~ ~s(cke-editable-height)
    end

    test "not sets editable height when set to nil" do
      html =
        render_component(&Editor.render/1, id: "editor6", name: "content6", editable_height: nil)

      refute html =~ ~s(cke-editable-height)
    end

    test "sets editable height even if it does not end with px" do
      html =
        render_component(&Editor.render/1,
          id: "editor7",
          name: "content7",
          editable_height: "300"
        )

      assert html =~ ~s(cke-editable-height="300")
    end

    test "sets editable height if value is number" do
      html =
        render_component(&Editor.render/1, id: "editor8", name: "content8", editable_height: 300)

      assert html =~ ~s(cke-editable-height="300")
    end
  end

  describe "validate attributes for editor type" do
    def error_message(attr, preset_type, hint) do
      "The `#{attr}` attribute is not supported for editor type '#{preset_type}'. #{hint}"
    end

    test "raises disallowed attributes for non-single-editing editors" do
      assert_raise Error,
                   error_message(:name, "multiroot", "Remove the `field` and `name` attributes."),
                   fn ->
                     render_component(&Editor.render/1,
                       id: "editor9",
                       name: "content9",
                       type: :multiroot
                     )
                   end
    end

    test "raises disallowed value attribute for non-single-editing editors" do
      assert_raise Error,
                   error_message(
                     :value,
                     "multiroot",
                     "Use the `<.cke_editable>` component to set content instead."
                   ),
                   fn ->
                     render_component(&Editor.render/1,
                       id: "editor10",
                       value: "test",
                       type: :multiroot
                     )
                   end
    end

    test "raises disallowed editable_height attribute for non-single-editing editors" do
      assert_raise Error,
                   error_message(
                     :editable_height,
                     "multiroot",
                     "Set height on individual editable areas if needed."
                   ),
                   fn ->
                     render_component(&Editor.render/1,
                       id: "editor11",
                       editable_height: "300px",
                       type: :multiroot
                     )
                   end
    end

    test "raises disallowed required attribute for non-single-editing editors" do
      assert_raise Error,
                   error_message(
                     :required,
                     "multiroot",
                     "The `required` attribute is only for form integration."
                   ),
                   fn ->
                     render_component(&Editor.render/1,
                       id: "editor12",
                       required: true,
                       type: :multiroot
                     )
                   end
    end

    test "should not raise any error if no disallowed attributes are present for non-single-editing editors" do
      html = render_component(&Editor.render/1, id: "editor13", type: :multiroot)
      assert html =~ ~s(id="editor13")
    end
  end

  describe "form support" do
    test "renders hidden input with correct name from :name attribute" do
      html =
        render_component(&Editor.render/1, id: "editor_form1", name: "my_content", value: "abc")

      assert html =~ ~s(<textarea)
      assert html =~ ~s(name="my_content")
    end

    test "renders hidden input with correct name from :field attribute (Phoenix.HTML.FormField)" do
      form = %HTML.Form{
        source: nil,
        id: "f",
        name: "f",
        params: %{},
        hidden: [],
        options: [],
        errors: [],
        data: %{}
      }

      field = %HTML.FormField{
        form: form,
        field: :body,
        name: "f[body]",
        id: "f_body",
        value: "test123",
        errors: []
      }

      html = render_component(&Editor.render/1, id: "editor_form2", field: field)

      assert html =~ ~s(<textarea)
      assert html =~ ~s(name="f[body]")
    end

    test "does not render hidden input if no name, field or form is given" do
      html = render_component(&Editor.render/1, id: "editor_form4", value: "noinput")
      refute html =~ ~s(<textarea)
    end
  end

  describe "push events" do
    test "pushes content changes to LiveView when enabled" do
      html =
        render_component(&Editor.render/1,
          id: "editor_push",
          name: "content_push",
          change_event: true
        )

      assert html =~ ~s(cke-change-event)
    end

    test "does not push content changes when disabled" do
      html =
        render_component(&Editor.render/1,
          id: "editor_no_push",
          name: "content_no_push",
          change_event: false
        )

      refute html =~ ~s(cke-change-event)
    end

    test "does not push content changes when not specified" do
      html =
        render_component(&Editor.render/1,
          id: "editor_default_push",
          name: "content_default_push"
        )

      refute html =~ ~s(cke-change-event)
    end

    test "pushes blur event when blur_event is true" do
      html =
        render_component(&Editor.render/1,
          id: "editor_blur",
          name: "content_blur",
          blur_event: true
        )

      assert html =~ ~s(cke-blur-event)
    end

    test "pushes focus event when focus_event is true" do
      html =
        render_component(&Editor.render/1,
          id: "editor_focus",
          name: "content_focus",
          focus_event: true
        )

      assert html =~ ~s(cke-focus-event)
    end
  end

  describe "save_debounce_ms attribute" do
    test "sets cke-save-debounce-ms attribute with default value" do
      html = render_component(&Editor.render/1, id: "editor_sd1", name: "content")
      assert html =~ ~s(cke-save-debounce-ms="400")
    end

    test "sets cke-save-debounce-ms attribute with custom value" do
      html =
        render_component(&Editor.render/1,
          id: "editor_sd2",
          name: "content",
          save_debounce_ms: 1234
        )

      assert html =~ ~s(cke-save-debounce-ms="1234")
    end
  end

  describe "language attribute handling" do
    test "sets default language to en if not provided" do
      html = render_component(&Editor.render/1, id: "editor_lang1", name: "content")
      assert html =~ ~s(cke-language="en")
      assert html =~ ~s(cke-content-language="en")
    end

    test "maps en-US to en" do
      html =
        render_component(&Editor.render/1, id: "editor_lang2", name: "content", language: "en-US")

      assert html =~ ~s(cke-language="en")
      assert html =~ ~s(cke-content-language="en")
    end

    test "passes Chinese language code correctly" do
      html =
        render_component(&Editor.render/1, id: "editor_lang3", name: "content", language: "zh-CN")

      assert html =~ ~s(cke-language="zh-cn")
      assert html =~ ~s(cke-content-language="zh-cn")
    end
  end

  describe "inner block rendering" do
    test "renders inner block content inside editor container" do
      html =
        render_component(fn assigns ->
          ~H"""
          <Editor.render id="editor_inner" name="content">
            <div class="custom-toolbar">Custom content</div>
            <span>Additional element</span>
          </Editor.render>
          """
        end)

      assert html =~ ~s(<div class="custom-toolbar">Custom content</div>)
      assert html =~ ~s(<span>Additional element</span>)
    end

    test "renders without inner block when not provided" do
      html = render_component(&Editor.render/1, id: "editor_no_inner", name: "content")

      assert html =~ ~s(id="editor_no_inner")
      assert html =~ ~s(<div id="editor_no_inner_editor"></div>)
    end
  end

  describe "watchdog attribute handling" do
    test "enables watchdog by default" do
      html = render_component(&Editor.render/1, id: "editor_watchdog_default", name: "content")
      assert html =~ ~s(cke-watchdog)
    end

    test "disables watchdog when set to false" do
      html =
        render_component(&Editor.render/1,
          id: "editor_watchdog_disabled",
          name: "content",
          watchdog: false
        )

      refute html =~ ~s(cke-watchdog)
    end

    test "enables watchdog when set to true" do
      html =
        render_component(&Editor.render/1,
          id: "editor_watchdog_enabled",
          name: "content",
          watchdog: true
        )

      assert html =~ ~s(cke-watchdog)
    end
  end

  describe "context" do
    test "sets context ID for multi-root editors" do
      html =
        render_component(&Editor.render/1,
          id: "editor_context",
          name: "content",
          context_id: "context_123"
        )

      assert html =~ ~s(cke-context-id="context_123")
    end

    test "does not set context ID for single-root editors" do
      html = render_component(&Editor.render/1, id: "editor_no_context", name: "content")
      refute html =~ ~s(cke-context-id)
    end
  end

  describe "editor container rendering" do
    test "renders editor container for classic editor" do
      html = render_component(&Editor.render/1, id: "editor_classic", type: :classic)
      assert html =~ ~s(<div id="editor_classic_editor"></div>)
    end

    test "does not render editor container for multiroot editor" do
      html = render_component(&Editor.render/1, id: "editor_multiroot", type: :multiroot)
      refute html =~ ~s(<div id="editor_multiroot_editor"></div>)
    end

    test "does not render editor container for decoupled editor" do
      html = render_component(&Editor.render/1, id: "editor_decoupled", type: :decoupled)
      refute html =~ ~s(<div id="editor_decoupled_editor"></div>)
    end
  end
end
