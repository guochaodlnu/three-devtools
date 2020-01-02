import { LitElement, html } from '../../../../web_modules/lit-element.js'
import { cssStringToHexNumber, hexNumberToCSSString } from '../../utils.js';

const $onChange = Symbol('onChange');
const anchor = document.createElement('a');
let kvIterator = 0;

export default class KeyValueElement extends LitElement {
  static get properties() {
    return {
      uuid: { type: String, reflect: true },
      // @TODO probably should use less generic/collision-y
      // attribute names.
      keyName: { type: String, reflect: true, attribute: 'key-name'},
      value: { type: String, reflect: true },
      type: { type: String, reflect: true },
      property: { type: String, reflect: true },
      // For number types only
      min: { type: Number, reflect: true },
      max: { type: Number, reflect: true },
      step: { type: Number, reflect: true },
      precision: { type: Number, reflect: true },
    }
  }

  constructor() {
    super();
    // Currently no way to handle a true label/input match
    // across shadow boundaries? Can this be handled better?
    // https://github.com/whatwg/html/issues/3219
    this._id = `key-value-element-${kvIterator++}`;
    this.precision = 1;
    this.step = 1;
    this.min = -Infinity;
    this.max = Infinity;
  }

  onDataURLClick(e) {
    try {
      let stringified = JSON.stringify(this.value, null, 2);
      let blob = new Blob([stringified], { type: 'application/json' });
      let url = window.URL.createObjectURL(blob);
      anchor.setAttribute('href', url);
      anchor.setAttribute('target', '_window');
      anchor.click();
      // Clean it up immediately so we're not storing
      // large buffers for the lifetime of the tools
      window.URL.revokeObjectURL(url);
    } catch (e) {
    }
    e.preventDefault();
  }

  render() {

    let valueElement;

    switch (this.type) {
      case 'array':
        if (this.value) {
          valueElement = html`
          <a href="#" @click=${e => this.onDataURLClick(e)}>
            array
          </a>`;
        }
        else {
          valueElement = html`[]`;
        }
        break;
      case 'enum':
        valueElement = html`<enum-value .uuid="${this.uuid}" .type="${this.property}" .value="${this.value}"></enum-value>`;
        break;
      case 'vec3':
        valueElement = [...new Array(3)].map((_, i) => html`<number-input
          .id="${i === 0 ? this._id : ''}"
          axis="${i === 0 ? 'x' : i === 1 ? 'y' : 'z'}"
          .value="${this.value[i]}"
          .min="${this.min}"
          .max="${this.max}"
          .step="${this.step}"
          .precision="${this.precision}"
          />`);
        break;
      case 'image':
        valueElement = html`<image-value .uuid="${this.value}"></image-value>`;
        break;
      case 'texture':
        valueElement = html`<texture-value .uuid="${this.value}"></texture-value>`;
        break;
      case 'material':
        valueElement = html`<material-value .uuid="${this.value}"></material-value>`;
        break;
      case 'geometry':
        valueElement = html`<geometry-value .uuid="${this.value}"></geometry-value>`;
        break;
      case 'color':
        valueElement = html`<input id="${this._id}" type="color" .value="${hexNumberToCSSString(+this.value)}" />`;
        break;
      case 'boolean':
        valueElement = html`<input id="${this._id}" type="checkbox" .checked="${this.value}" />`;
        break;
      case 'number':
      case 'int':
        valueElement = html`<number-input
          .id="${this._id}"
          .value="${this.value}"
          .min="${this.min}"
          .max="${this.max}"
          .step="${this.step}"
          .precision="${this.precision}"
          />`;
        break;
      case 'string':
        valueElement = this.value;
        break;
      default:
        valueElement = this.value;
    }

    return html`
<style>
  /**
   * Current CSS API:
   *
   * --key-value-height: auto; // Yes can be styled by parent, but this ensures
   *                           // that all views use the same height
   * --key-value-divider-position: 30%;
   * --key-value-padding-left: 10px;
   */

  :host {
    height: var(--key-value-height, auto);
    width: 100%;
    display: flex;
    align-items: center;
  }

  label {
    flex: 0 0 var(--key-value-divider-position, 30%);
  }
  #value {
    flex: 1;
  }

  label, #value {
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    padding-left: var(--key-value-padding-left, 10px);
  }

  #value[type="vec3"] number-input {
    width: 33%;
  }

</style>
<label for="${this._id}">${this.keyName}</label>
<div name="${this.keyName}" @change="${this[$onChange]}" id="value" type="${this.type}">
  ${valueElement}
</div>
`;
  }

  [$onChange](e) {

    const target = e.composedPath()[0];

    let value = null;
    let dataType = null;
    let property = this.property;
    switch (this.type) {
      case 'color':
        value = target.value ? cssStringToHexNumber(target.value) : 0;
        dataType = 'color';
        break;
      case 'checkbox':
        value = !!target.checked;
        dataType = 'boolean';
        break;
      case 'number':
        dataType = 'number';
        value = target.value;
        break;
      case 'enum':
        dataType = 'number';
        value = e.detail.value;
        break;
      case 'vec3':
        dataType = 'vec3';
        value = e.detail.value;
        // Add 'x', 'y' or 'z' to the property name
        property = `${this.property}.${target.getAttribute('axis')}`;
        break;
      default:
        value = target.value;
    }

    if (value !== null) {
      this.dispatchEvent(new CustomEvent('command', { detail: {
        type: 'update-property',
        uuid: this.uuid,
        property,
        dataType,
        value,
      },
        bubbles: true,
        composed: true,
      }));
    }
  }
}
