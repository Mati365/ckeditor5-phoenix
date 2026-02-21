defmodule CKEditor5.Components.RootValueSentinel do
  @moduledoc """
  This module defines a Phoenix component that serves as a sentinel for the root value
  of the CKEditor 5 instance in a LiveView. It renders a hidden div element that holds
  the current value of the editor, which can be used for synchronization between the client
  and server.
  """

  use Phoenix.Component

  @doc """
  Renders a hidden div element that contains the current value of the editor. This is used
  as a sentinel for the editor's root value, allowing for synchronization between the client and server.
  """

  attr :editor_id, :string,
    required: true,
    doc: "The ID for the editor instance."

  attr :value, :string,
    required: true,
    doc: "The current value of the editor."

  attr :root, :string,
    required: false,
    default: "main",
    doc:
      "The name of the root element for multi-root editors. If not provided, it defaults to 'main'."

  def render(assigns) do
    ~H"""
    <div
      id={"#{@editor_id}_sentinel"}
      style="display:none"
      phx-hook="CKRootValueSentinel"
      data-cke-editor-id={@editor_id}
      data-cke-root-name={@root}
      data-cke-value={@value}
    >
    </div>
    """
  end
end
