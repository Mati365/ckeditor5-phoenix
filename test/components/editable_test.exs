defmodule CKEditor5.Components.EditableTest do
  use ExUnit.Case, async: true

  import Phoenix.LiveViewTest

  alias CKEditor5.Components.Editable
  alias Phoenix.HTML

  test "renders editable with all attributes and hidden input" do
    html =
      render_component(&Editable.render/1,
        root: "main",
        editor_id: "editor-1",
        name: "content",
        value: "Hello",
        required: true
      )

    assert html =~ ~s(phx-hook="CKEditable")
    assert html =~ ~s(data-cke-editor-id="editor-1")
    assert html =~ ~s(data-cke-editable-root-name="main")
    assert html =~ ~s(data-cke-editable-initial-value="Hello")
    assert html =~ ~s(data-cke-editable-required)
    assert html =~ ~s(<textarea)
    assert html =~ ~s(name="content")
    assert html =~ ~s(value="Hello")
    assert html =~ ~s(required)
  end

  test "it should assign random ID if missing" do
    html = render_component(&Editable.render/1, root: "main", editor_id: "editor-1")
    assert html =~ ~s(id="cke-editable-)
    assert html =~ ~s(phx-hook="CKEditable")
  end

  test "it assigns proper id if passed" do
    html =
      render_component(&Editable.render/1, root: "main", editor_id: "editor-1", id: "custom-id")

    assert html =~ ~s(id="custom-id")
    assert html =~ ~s(phx-hook="CKEditable")
  end

  test "it is possible to pass CSS class to component" do
    html =
      render_component(&Editable.render/1,
        root: "main",
        editor_id: "editor-1",
        class: "custom-class"
      )

    assert html =~ ~s(class="custom-class")
  end

  test "it is possible to pass CSS styles to component" do
    html =
      render_component(&Editable.render/1,
        root: "main",
        editor_id: "editor-1",
        style: "color: red;"
      )

    assert html =~ ~s(style="color: red;")
  end

  test "renders editable without name (no hidden input)" do
    html = render_component(&Editable.render/1, root: "main", editor_id: "editor-1")

    assert html =~ ~s(phx-hook="CKEditable")
    assert html =~ ~s(data-cke-editable-root-name="main")
    refute html =~ ~s(<input)
  end

  test "renders editable with default \"main\" root for decoupled editor when not specified" do
    html = render_component(&Editable.render/1, editor_id: "editor-1")

    assert html =~ ~s(phx-hook="CKEditable")
    assert html =~ ~s(data-cke-editable-root-name="main")
    assert html =~ ~s(data-cke-editor-id="editor-1")
  end

  describe "form support" do
    test "renders editable with form field attributes" do
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

      html =
        render_component(&Editable.render/1, root: "main", editor_id: "editor-1", field: field)

      assert html =~ ~s(name="f[body]")
      assert html =~ ~s(value="test123")
    end

    test "renders editable without form field attributes" do
      html = render_component(&Editable.render/1, root: "main", editor_id: "editor-1")

      refute html =~ ~s(<input)
    end
  end
end
