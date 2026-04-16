defmodule CKEditor5.Components.ContextTest do
  use CKEditor5.Test.ContextsTestCaseTemplate, async: true

  import Phoenix.LiveViewTest
  import Phoenix.Component

  alias CKEditor5.Components.Context

  test "renders context with preset name" do
    html = render_component(&Context.render/1, context: "default", id: "ctx-1")
    assert html =~ ~s(id="ctx-1")
    assert html =~ ~s(phx-hook="CKContext")
    assert html =~ ~s(cke-context=)
    assert html =~ "foo"
    assert html =~ "bar"
  end

  test "renders context with Context struct" do
    context = %CKEditor5.Context{config: %{baz: :qux}}
    html = render_component(&Context.render/1, context: context, id: "ctx-2")
    assert html =~ ~s(id="ctx-2")
    assert html =~ ~s(phx-hook="CKContext")
    assert html =~ ~s(cke-context=)
    assert html =~ "baz"
    assert html =~ "qux"
  end

  test "it should assign random ID if not provided (string context)" do
    html = render_component(&Context.render/1, context: "default")
    assert html =~ ~s(id="cke-context-default)
    assert html =~ ~s(phx-hook="CKContext")
  end

  test "it should assign random ID if not provided (object context)" do
    context = %CKEditor5.Context{config: %{baz: :qux}}
    html = render_component(&Context.render/1, context: context)

    assert html =~ ~s(id="cke-context-custom)
    assert html =~ ~s(phx-hook="CKContext")
  end

  test "it should not set phx-update=\"ignore\"" do
    html = render_component(&Context.render/1, context: "default")

    refute html =~ ~s(phx-update="ignore")
  end

  test "it is possible to pass CSS class to component" do
    html =
      render_component(&Context.render/1, context: "default", id: "ctx-3", class: "custom-class")

    assert html =~ ~s(class="custom-class")
  end

  test "passes watchdog config if present" do
    put_contexts_env(%{
      "with-watchdog" => %{
        config: %{},
        watchdog: %{foo: "bar"}
      }
    })

    html = render_component(&Context.render/1, context: "with-watchdog", id: "ctx-5")
    assert html =~ ~s(id="ctx-5")
    assert html =~ ~s(phx-hook="CKContext")
    assert html =~ "foo"
    assert html =~ "bar"
  end

  test "it is possible to pass CSS styles to component" do
    html =
      render_component(&Context.render/1, context: "default", id: "ctx-4", style: "color: red;")

    assert html =~ ~s(style="color: red;")
  end

  describe "inner block rendering" do
    test "renders inner block content inside editor container" do
      html =
        render_component(fn assigns ->
          ~H"""
          <Context.render id="editor_inner" context="default">
            <div class="custom-toolbar">Custom content</div>
            <span>Additional element</span>
          </Context.render>
          """
        end)

      assert html =~ ~s(<div class="custom-toolbar">Custom content</div>)
      assert html =~ ~s(<span>Additional element</span>)
    end

    test "renders without inner block when not provided" do
      html = render_component(&Context.render/1, id: "context_no_inner", context: "default")

      assert html =~ ~s(id="context_no_inner")
      assert html =~ ~s(>\n  \n</div>)
    end
  end

  describe "language attribute handling" do
    test "uses provided language for editor UI" do
      html =
        render_component(&Context.render/1,
          language: :en,
          context: "default",
          id: "ctx-lang-en",
          language: "en"
        )

      assert html =~ ~s(cke-language="en")
    end

    test "uses provided content language for editable area" do
      html =
        render_component(&Context.render/1,
          content_language: :pl,
          context: "default",
          id: "ctx-lang-pl",
          content_language: "pl"
        )

      assert html =~ ~s(cke-content-language="pl")
    end

    test "doesn't use any language if not specified" do
      html = render_component(&Context.render/1, context: "default", id: "ctx-lang-default")
      refute html =~ ~s(cke-content-language)
      refute html =~ ~s(cke-language)
    end
  end
end
