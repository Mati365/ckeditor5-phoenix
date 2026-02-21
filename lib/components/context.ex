defmodule CKEditor5.Components.Context do
  @moduledoc """
  A component for rendering a CKEditor5 context.
  """

  use Phoenix.Component

  alias CKEditor5.{Context, Contexts, Helpers}

  attr :id, :string,
    required: false,
    doc:
      "The ID of the context to be used. " <>
        "Use it later in editor components to specify which context to use." <>
        "If not specified, then a random ID will be generated."

  attr :context, :any,
    required: true,
    doc: "The name or reference of the context to be used."

  slot :inner_block,
    required: false,
    doc:
      "Optional content of the context. Every editor instance within block will use this context."

  attr :language, :string,
    required: false,
    default: nil,
    doc:
      "The language code for the editor UI (e.g., 'en', 'pl', 'de', etc.). If not provided, will use the default \"en\" language."

  attr :content_language, :string,
    required: false,
    default: nil,
    doc:
      "The content language code for the editor (e.g. 'en', 'pl', 'de', etc.). This is used to set the `lang` attribute on the editable area. " <>
        "If not provided, it will default to the same value as `language`."

  attr :rest, :global

  def render(assigns) do
    assigns =
      assigns
      |> Helpers.generate_id_if_missing("cke-context")
      |> load_context()

    ~H"""
    <div
      id={@id}
      phx-hook="CKContext"
      phx-update="ignore"
      data-cke-language={@language}
      data-cke-content-language={@content_language}
      data-cke-context={Jason.encode!(@context)}
      {@rest}
    >
      <%= render_slot(@inner_block) %>
    </div>
    """
  end

  # Loads the preset configuration from the preset name
  defp load_context(%{context: %Context{}} = assigns), do: assigns

  defp load_context(%{context: preset} = assigns) when is_binary(preset) do
    preset = Contexts.get!(preset)

    Map.put(assigns, :context, preset)
  end
end
